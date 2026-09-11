import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ApiError,
  currentUserRequest,
  loginRequest,
  logoutRequest,
  refreshRequest,
  type CurrentUser,
  type TokenPair,
} from "../lib/api";
import {
  AuthContext,
  type AuthContextValue,
  type LoginCredentials,
} from "./auth-context";
import {
  accessExpiryFromLifetime,
  refreshDelayMs,
  secondsUntilExpiry,
} from "./session-timing";

const ACCESS_TOKEN_KEY = "warehouse_ai_access_token";
const REFRESH_TOKEN_KEY = "warehouse_ai_refresh_token";
const ACCESS_EXPIRES_AT_KEY = "warehouse_ai_access_expires_at";

function readStoredTokens(): TokenPair | null {
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  const expiresAtRaw = sessionStorage.getItem(ACCESS_EXPIRES_AT_KEY);
  if (!accessToken || !refreshToken) {
    return null;
  }

  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : Number.NaN;
  const expiresIn = secondsUntilExpiry(expiresAt, Date.now());

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: expiresIn,
  };
}

function storeTokens(tokens: TokenPair): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  if (tokens.expires_in > 0) {
    sessionStorage.setItem(
      ACCESS_EXPIRES_AT_KEY,
      String(accessExpiryFromLifetime(Date.now(), tokens.expires_in)),
    );
  } else {
    sessionStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
  }
}

function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const bootstrapStarted = useRef(false);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const establishSession = useCallback(async (tokens: TokenPair) => {
    const currentUser = await currentUserRequest(tokens.access_token);
    storeTokens(tokens);
    setUser(currentUser);
    setStatus("authenticated");
    setSessionGeneration((value) => value + 1);
  }, []);

  const expireLocalSession = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refreshSession = useCallback(async () => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }

    const stored = readStoredTokens();
    if (!stored?.refresh_token) {
      expireLocalSession();
      return;
    }

    const refreshWork = (async () => {
      const replacement = await refreshRequest(stored.refresh_token);
      await establishSession(replacement);
    })();
    refreshInFlight.current = refreshWork;

    try {
      await refreshWork;
    } finally {
      refreshInFlight.current = null;
    }
  }, [establishSession, expireLocalSession]);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;

    async function bootstrap() {
      const stored = readStoredTokens();
      if (!stored) {
        setStatus("unauthenticated");
        return;
      }

      try {
        const currentUser = await currentUserRequest(stored.access_token);
        setUser(currentUser);
        setStatus("authenticated");
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          expireLocalSession();
          return;
        }

        try {
          await refreshSession();
        } catch {
          expireLocalSession();
        }
      }
    }

    void bootstrap();
  }, [expireLocalSession, refreshSession]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const expiresAtRaw = sessionStorage.getItem(ACCESS_EXPIRES_AT_KEY);
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : Number.NaN;
    if (!Number.isFinite(expiresAt)) return;

    const timer = window.setTimeout(() => {
      void refreshSession().catch(() => {
        expireLocalSession();
      });
    }, refreshDelayMs(expiresAt, Date.now()));

    return () => window.clearTimeout(timer);
  }, [expireLocalSession, refreshSession, sessionGeneration, status]);

  const login = useCallback(
    async ({ username, password }: LoginCredentials) => {
      const tokens = await loginRequest(username, password);
      try {
        await establishSession(tokens);
      } catch (error) {
        expireLocalSession();
        throw error;
      }
    },
    [establishSession, expireLocalSession],
  );

  const logout = useCallback(async () => {
    const stored = readStoredTokens();
    try {
      if (stored?.refresh_token) {
        await logoutRequest(stored.refresh_token);
      }
    } finally {
      expireLocalSession();
    }
  }, [expireLocalSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
