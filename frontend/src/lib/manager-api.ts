import { apiBaseUrl, ApiError } from "./api";

interface ErrorEnvelope {
  error?: unknown;
  message?: unknown;
  correlation_id?: unknown;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicineBatch {
  id: number;
  code: string;
  medicine_id: number;
  medicine_name: string;
  supplier_id: number;
  supplier_name: string;
  quantity_received: number;
  quantity_remaining: number;
  received_date: string;
  expiry_date: string;
  purchase_price: string;
  selling_price: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  medicine_id: number;
  medicine_name: string;
  batch_id: number;
  batch_code: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface Invoice {
  id: number;
  code: string;
  status: string;
  total_amount: string;
  created_by_user_id: number;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
}

export interface InventoryRow {
  batch_id: number;
  batch_code: string;
  medicine_id: number;
  medicine_code: string;
  medicine_name: string;
  quantity_remaining: number;
  expiry_date: string;
  selling_price: string;
}

export interface ExpiryRow extends InventoryRow {
  days_remaining: number;
  status: string;
}

export interface ReportSummary {
  finalized_invoice_count: number;
  revenue: string;
  inventory_units: number;
  expired_lots: number;
  expiring_lots: number | null;
}

export interface AdvancedMedicine {
  medicine_id: number;
  code: string;
  name: string;
  group_name: string;
  unit_name: string;
  available_quantity: number;
  min_selling_price: string | null;
  max_selling_price: string | null;
  nearest_expiry: string | null;
}

export interface ManagedAccount {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

async function buildApiError(response: Response): Promise<ApiError> {
  let body: ErrorEnvelope | null = null;
  try {
    body = (await response.json()) as ErrorEnvelope;
  } catch {
    body = null;
  }
  const code = typeof body?.error === "string" ? body.error : null;
  const message =
    typeof body?.message === "string"
      ? body.message
      : `Request failed with status ${response.status}`;
  const correlationId =
    typeof body?.correlation_id === "string"
      ? body.correlation_id
      : response.headers.get("X-Correlation-ID");
  return new ApiError(response.status, message, code, correlationId);
}

async function requestJson<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  if (!response.ok) throw await buildApiError(response);
  return response.json() as Promise<T>;
}

async function requestEmpty(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  if (!response.ok) throw await buildApiError(response);
}

export function suppliersRequest(accessToken: string): Promise<Supplier[]> {
  return requestJson<Supplier[]>(accessToken, "/api/v1/suppliers");
}

export function createSupplierRequest(
  accessToken: string,
  payload: { name: string; phone?: string; address?: string; notes?: string },
): Promise<Supplier> {
  return requestJson<Supplier>(accessToken, "/api/v1/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function batchesRequest(accessToken: string): Promise<MedicineBatch[]> {
  return requestJson<MedicineBatch[]>(accessToken, "/api/v1/batches");
}

export function createBatchRequest(
  accessToken: string,
  payload: {
    code: string;
    medicine_id: number;
    supplier_id: number;
    quantity_received: number;
    received_date: string;
    expiry_date: string;
    purchase_price: number;
    selling_price: number;
  },
): Promise<MedicineBatch> {
  return requestJson<MedicineBatch>(accessToken, "/api/v1/batches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function inventoryRequest(
  accessToken: string,
  threshold?: number,
): Promise<InventoryRow[]> {
  const params = new URLSearchParams();
  if (threshold !== undefined) params.set("threshold", String(threshold));
  const query = params.toString();
  return requestJson<InventoryRow[]>(
    accessToken,
    `/api/v1/inventory${query ? `?${query}` : ""}`,
  );
}

export function expiringBatchesRequest(
  accessToken: string,
  withinDays: number,
): Promise<ExpiryRow[]> {
  return requestJson<ExpiryRow[]>(
    accessToken,
    `/api/v1/expiry/expiring?within_days=${withinDays}`,
  );
}

export function expiredBatchesRequest(accessToken: string): Promise<ExpiryRow[]> {
  return requestJson<ExpiryRow[]>(accessToken, "/api/v1/expiry/expired");
}

export function invoicesRequest(accessToken: string): Promise<Invoice[]> {
  return requestJson<Invoice[]>(accessToken, "/api/v1/invoices");
}

export function createInvoiceRequest(
  accessToken: string,
  payload: { code: string; items: Array<{ batch_id: number; quantity: number }> },
): Promise<Invoice> {
  return requestJson<Invoice>(accessToken, "/api/v1/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function finalizeInvoiceRequest(
  accessToken: string,
  invoiceId: number,
): Promise<Invoice> {
  return requestJson<Invoice>(accessToken, `/api/v1/invoices/${invoiceId}/finalize`, {
    method: "POST",
  });
}

export function cancelInvoiceRequest(
  accessToken: string,
  invoiceId: number,
): Promise<Invoice> {
  return requestJson<Invoice>(accessToken, `/api/v1/invoices/${invoiceId}/cancel`, {
    method: "POST",
  });
}

export function reportSummaryRequest(
  accessToken: string,
  expiryWithinDays: number,
): Promise<ReportSummary> {
  return requestJson<ReportSummary>(
    accessToken,
    `/api/v1/reports/summary?expiry_within_days=${expiryWithinDays}`,
  );
}

export function advancedMedicineLookupRequest(
  accessToken: string,
  query: string,
): Promise<AdvancedMedicine[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson<AdvancedMedicine[]>(
    accessToken,
    `/api/v1/lookup/medicines/advanced${suffix}`,
  );
}

export function accountsRequest(accessToken: string): Promise<ManagedAccount[]> {
  return requestJson<ManagedAccount[]>(accessToken, "/api/v1/admin/users");
}

export function createAccountRequest(
  accessToken: string,
  payload: { username: string; password: string; role: string },
): Promise<ManagedAccount> {
  return requestJson<ManagedAccount>(accessToken, "/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function changeAccountRoleRequest(
  accessToken: string,
  userId: number,
  role: string,
): Promise<ManagedAccount> {
  return requestJson<ManagedAccount>(accessToken, `/api/v1/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function changeAccountActiveRequest(
  accessToken: string,
  userId: number,
  isActive: boolean,
): Promise<ManagedAccount> {
  return requestJson<ManagedAccount>(accessToken, `/api/v1/admin/users/${userId}/active`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function resetAccountPasswordRequest(
  accessToken: string,
  userId: number,
  password: string,
): Promise<void> {
  return requestEmpty(accessToken, `/api/v1/admin/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}
