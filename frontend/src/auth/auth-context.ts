import { createContext, useContext } from "react";

import type { CurrentUser } from "../lib/api";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthContextValue {
  status: "loading" | "authenticated" | "unauthenticated";
  user: CurrentUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
