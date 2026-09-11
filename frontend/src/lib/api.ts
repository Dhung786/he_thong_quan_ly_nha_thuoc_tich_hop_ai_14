export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface CurrentUser {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
}

export interface HealthResponse {
  core: string;
  database: string;
  migration: string;
  ai: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function loginRequest(username: string, password: string): Promise<TokenPair> {
  return requestJson<TokenPair>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function refreshRequest(refreshToken: string): Promise<TokenPair> {
  return requestJson<TokenPair>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok && response.status !== 401) {
    throw new ApiError(response.status, `Logout failed with status ${response.status}`);
  }
}

export function currentUserRequest(accessToken: string): Promise<CurrentUser> {
  return requestJson<CurrentUser>("/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function healthRequest(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) {
    throw new ApiError(response.status, "Backend health check failed");
  }
  return response.json() as Promise<HealthResponse>;
}
