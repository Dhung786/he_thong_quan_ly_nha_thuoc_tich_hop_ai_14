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

export interface MedicineGroup {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Medicine {
  id: number;
  code: string;
  name: string;
  group_id: number;
  unit_id: number;
  group_name: string;
  unit_name: string;
  created_at: string;
  updated_at: string;
}

export interface MedicineInput {
  code: string;
  name: string;
  group_id: number;
  unit_id: number;
}

export type AdminRole = "MANAGER" | "PHARMACIST" | "CASHIER";

export interface AdminUser {
  id: number;
  username: string;
  role: AdminRole;
  role_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminSummary {
  total_users: number;
  active_users: number;
  inactive_users: number;
  managers: number;
  pharmacists: number;
  cashiers: number;
  audit_events: number;
}

export interface AdminAuditLog {
  id: number;
  actor_user_id: number | null;
  actor_username: string | null;
  event_type: string;
  correlation_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface ErrorEnvelope {
  error?: unknown;
  message?: unknown;
  correlation_id?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly correlationId: string | null;

  constructor(
    status: number,
    message: string,
    code: string | null = null,
    correlationId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

async function buildApiError(response: Response): Promise<ApiError> {
  let envelope: ErrorEnvelope | null = null;
  try {
    envelope = (await response.json()) as ErrorEnvelope;
  } catch {
    envelope = null;
  }

  const code = typeof envelope?.error === "string" ? envelope.error : null;
  const message =
    typeof envelope?.message === "string"
      ? envelope.message
      : `Request failed with status ${response.status}`;
  const bodyCorrelationId =
    typeof envelope?.correlation_id === "string" ? envelope.correlation_id : null;
  const headerCorrelationId = response.headers.get("X-Correlation-ID");

  return new ApiError(
    response.status,
    message,
    code,
    bodyCorrelationId ?? headerCorrelationId,
  );
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
    throw await buildApiError(response);
  }

  return response.json() as Promise<T>;
}

async function requestEmpty(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw await buildApiError(response);
  }
}

function bearer(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
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
    throw await buildApiError(response);
  }
}

export function currentUserRequest(accessToken: string): Promise<CurrentUser> {
  return requestJson<CurrentUser>("/api/v1/auth/me", {
    headers: bearer(accessToken),
  });
}

export async function healthRequest(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) {
    throw await buildApiError(response);
  }
  return response.json() as Promise<HealthResponse>;
}

export function medicineGroupsRequest(accessToken: string): Promise<MedicineGroup[]> {
  return requestJson<MedicineGroup[]>("/api/v1/catalog/groups", {
    headers: bearer(accessToken),
  });
}

export function createMedicineGroupRequest(
  accessToken: string,
  name: string,
): Promise<MedicineGroup> {
  return requestJson<MedicineGroup>("/api/v1/catalog/groups", {
    method: "POST",
    headers: bearer(accessToken),
    body: JSON.stringify({ name }),
  });
}

export function updateMedicineGroupRequest(
  accessToken: string,
  id: number,
  name: string,
): Promise<MedicineGroup> {
  return requestJson<MedicineGroup>(`/api/v1/catalog/groups/${id}`, {
    method: "PUT",
    headers: bearer(accessToken),
    body: JSON.stringify({ name }),
  });
}

export function deleteMedicineGroupRequest(accessToken: string, id: number): Promise<void> {
  return requestEmpty(`/api/v1/catalog/groups/${id}`, {
    method: "DELETE",
    headers: bearer(accessToken),
  });
}

export function unitsRequest(accessToken: string): Promise<Unit[]> {
  return requestJson<Unit[]>("/api/v1/catalog/units", {
    headers: bearer(accessToken),
  });
}

export function createUnitRequest(accessToken: string, name: string): Promise<Unit> {
  return requestJson<Unit>("/api/v1/catalog/units", {
    method: "POST",
    headers: bearer(accessToken),
    body: JSON.stringify({ name }),
  });
}

export function updateUnitRequest(
  accessToken: string,
  id: number,
  name: string,
): Promise<Unit> {
  return requestJson<Unit>(`/api/v1/catalog/units/${id}`, {
    method: "PUT",
    headers: bearer(accessToken),
    body: JSON.stringify({ name }),
  });
}

export function deleteUnitRequest(accessToken: string, id: number): Promise<void> {
  return requestEmpty(`/api/v1/catalog/units/${id}`, {
    method: "DELETE",
    headers: bearer(accessToken),
  });
}

export function medicinesRequest(
  accessToken: string,
  filters: { q?: string; groupId?: number; unitId?: number } = {},
): Promise<Medicine[]> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.groupId) params.set("group_id", String(filters.groupId));
  if (filters.unitId) params.set("unit_id", String(filters.unitId));
  const query = params.toString();
  return requestJson<Medicine[]>(`/api/v1/catalog/medicines${query ? `?${query}` : ""}`, {
    headers: bearer(accessToken),
  });
}

export function createMedicineRequest(
  accessToken: string,
  payload: MedicineInput,
): Promise<Medicine> {
  return requestJson<Medicine>("/api/v1/catalog/medicines", {
    method: "POST",
    headers: bearer(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateMedicineRequest(
  accessToken: string,
  id: number,
  payload: MedicineInput,
): Promise<Medicine> {
  return requestJson<Medicine>(`/api/v1/catalog/medicines/${id}`, {
    method: "PUT",
    headers: bearer(accessToken),
    body: JSON.stringify(payload),
  });
}

export function deleteMedicineRequest(accessToken: string, id: number): Promise<void> {
  return requestEmpty(`/api/v1/catalog/medicines/${id}`, {
    method: "DELETE",
    headers: bearer(accessToken),
  });
}

export function adminSummaryRequest(accessToken: string): Promise<AdminSummary> {
  return requestJson<AdminSummary>("/api/v1/admin/summary", {
    headers: bearer(accessToken),
  });
}

export function adminUsersRequest(accessToken: string): Promise<AdminUser[]> {
  return requestJson<AdminUser[]>("/api/v1/admin/users", {
    headers: bearer(accessToken),
  });
}

export function createAdminUserRequest(
  accessToken: string,
  payload: { username: string; password: string; role: AdminRole },
): Promise<AdminUser> {
  return requestJson<AdminUser>("/api/v1/admin/users", {
    method: "POST",
    headers: bearer(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminUserRoleRequest(
  accessToken: string,
  userId: number,
  role: AdminRole,
): Promise<AdminUser> {
  return requestJson<AdminUser>(`/api/v1/admin/users/${userId}/role`, {
    method: "PUT",
    headers: bearer(accessToken),
    body: JSON.stringify({ role }),
  });
}

export function updateAdminUserStatusRequest(
  accessToken: string,
  userId: number,
  isActive: boolean,
): Promise<AdminUser> {
  return requestJson<AdminUser>(`/api/v1/admin/users/${userId}/status`, {
    method: "PUT",
    headers: bearer(accessToken),
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function resetAdminUserPasswordRequest(
  accessToken: string,
  userId: number,
  password: string,
): Promise<void> {
  return requestEmpty(`/api/v1/admin/users/${userId}/password`, {
    method: "PUT",
    headers: bearer(accessToken),
    body: JSON.stringify({ password }),
  });
}

export function adminAuditLogsRequest(accessToken: string): Promise<AdminAuditLog[]> {
  return requestJson<AdminAuditLog[]>("/api/v1/admin/audit-logs?limit=100", {
    headers: bearer(accessToken),
  });
}
