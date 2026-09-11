import { useCallback, useEffect, useMemo, useState } from "react";

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

const ACCESS_TOKEN_KEY = "warehouse_ai_access_token";
const REFRESH_TOKEN_KEY = "warehouse_ai_refresh_token";

function readStoredTokens(): TokenPair | null {
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: 0,
  };
}

function storeTokens(tokens: TokenPair): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

function clearTokens(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);

  const establishSession = useCallback(async (tokens: TokenPair) => {
    storeTokens(tokens);
    const currentUser = await currentUserRequest(tokens.access_token);
    setUser(currentUser);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const stored = readStoredTokens();
      if (!stored) {
        if (active) setStatus("unauthenticated");
        return;
      }

      try {
        const currentUser = await currentUserRequest(stored.access_token);
        if (!active) return;
        setUser(currentUser);
        setStatus("authenticated");
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          clearTokens();
          if (active) setStatus("unauthenticated");
          return;
        }

        try {
          const replacement = await refreshRequest(stored.refresh_token);
          if (!active) return;
          await establishSession(replacement);
        } catch {
          clearTokens();
          if (active) {
            setUser(null);
            setStatus("unauthenticated");
          }
        }
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [establishSession]);

  const login = useCallback(
    async ({ username, password }: LoginCredentials) => {
      const tokens = await loginRequest(username, password);
      await establishSession(tokens);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    const stored = readStoredTokens();
    try {
      if (stored?.refresh_token) {
        await logoutRequest(stored.refresh_token);
      }
    } finally {
      clearTokens();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
