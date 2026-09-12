import { apiBaseUrl, ApiError, type Medicine } from "./api";
import type {
  ExpiryRow,
  InventoryRow,
  Invoice,
  MedicineBatch,
  ReportSummary,
  Supplier,
} from "./manager-api";

interface ErrorEnvelope {
  error?: unknown;
  message?: unknown;
  correlation_id?: unknown;
}

export interface PharmacistDashboard {
  medicine_count: number;
  inventory_units: number;
  low_stock_lots: number;
  expiring_lots: number;
  expired_lots: number;
  finalized_invoice_count: number;
  revenue: string;
}

export interface PharmacistProfile {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PharmacistAIStatus {
  provider: string;
  model: string | null;
  configured: boolean;
  scope_guard: string;
}

export interface PharmacistAITextResponse {
  answer: string;
  provider: string;
  model: string | null;
  scope_guard: string;
  disclaimer: string;
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
  const correlationId =
    typeof envelope?.correlation_id === "string"
      ? envelope.correlation_id
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

export async function pharmacistMedicineLookupRequest(
  accessToken: string,
  query = "",
): Promise<Medicine[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson<Medicine[]>(
    accessToken,
    `/api/v1/lookup/medicines${suffix}`,
  );
}

export function pharmacistDashboardRequest(
  accessToken: string,
  lowStockThreshold = 20,
  expiryWithinDays = 90,
): Promise<PharmacistDashboard> {
  const params = new URLSearchParams({
    low_stock_threshold: String(lowStockThreshold),
    expiry_within_days: String(expiryWithinDays),
  });
  return requestJson<PharmacistDashboard>(
    accessToken,
    `/api/v1/pharmacist/dashboard?${params.toString()}`,
  );
}

export function pharmacistInventoryRequest(
  accessToken: string,
  threshold?: number,
): Promise<InventoryRow[]> {
  const params = new URLSearchParams();
  if (threshold !== undefined) params.set("threshold", String(threshold));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson<InventoryRow[]>(accessToken, `/api/v1/inventory${suffix}`);
}

export function pharmacistBatchesRequest(accessToken: string): Promise<MedicineBatch[]> {
  return requestJson<MedicineBatch[]>(accessToken, "/api/v1/batches");
}

export function pharmacistSuppliersRequest(accessToken: string): Promise<Supplier[]> {
  return requestJson<Supplier[]>(accessToken, "/api/v1/suppliers");
}

export function pharmacistExpiringRequest(
  accessToken: string,
  withinDays = 90,
): Promise<ExpiryRow[]> {
  return requestJson<ExpiryRow[]>(
    accessToken,
    `/api/v1/expiry/expiring?within_days=${withinDays}`,
  );
}

export function pharmacistExpiredRequest(accessToken: string): Promise<ExpiryRow[]> {
  return requestJson<ExpiryRow[]>(accessToken, "/api/v1/expiry/expired");
}

export function pharmacistInvoicesRequest(accessToken: string): Promise<Invoice[]> {
  return requestJson<Invoice[]>(accessToken, "/api/v1/pharmacist/invoices");
}

export function pharmacistCreateInvoiceRequest(
  accessToken: string,
  payload: { code: string; items: Array<{ batch_id: number; quantity: number }> },
): Promise<Invoice> {
  return requestJson<Invoice>(accessToken, "/api/v1/pharmacist/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function pharmacistFinalizeInvoiceRequest(
  accessToken: string,
  invoiceId: number,
): Promise<Invoice> {
  return requestJson<Invoice>(
    accessToken,
    `/api/v1/pharmacist/invoices/${invoiceId}/finalize`,
    { method: "POST" },
  );
}

export function pharmacistCancelInvoiceRequest(
  accessToken: string,
  invoiceId: number,
): Promise<Invoice> {
  return requestJson<Invoice>(
    accessToken,
    `/api/v1/pharmacist/invoices/${invoiceId}/cancel`,
    { method: "POST" },
  );
}

export function pharmacistReportRequest(
  accessToken: string,
  expiryWithinDays = 90,
): Promise<ReportSummary> {
  return requestJson<ReportSummary>(
    accessToken,
    `/api/v1/pharmacist/reports/summary?expiry_within_days=${expiryWithinDays}`,
  );
}

export function pharmacistProfileRequest(
  accessToken: string,
): Promise<PharmacistProfile> {
  return requestJson<PharmacistProfile>(accessToken, "/api/v1/pharmacist/profile");
}

export function pharmacistAIStatusRequest(
  accessToken: string,
): Promise<PharmacistAIStatus> {
  return requestJson<PharmacistAIStatus>(accessToken, "/api/v1/pharmacist/ai/status");
}

export function pharmacistMedicineSummaryRequest(
  accessToken: string,
  medicineId: number,
): Promise<PharmacistAITextResponse> {
  return requestJson<PharmacistAITextResponse>(
    accessToken,
    "/api/v1/pharmacist/ai/medicine-summary",
    { method: "POST", body: JSON.stringify({ medicine_id: medicineId }) },
  );
}

export function pharmacistExpiryAIReportRequest(
  accessToken: string,
  warningDays: number,
): Promise<PharmacistAITextResponse> {
  return requestJson<PharmacistAITextResponse>(
    accessToken,
    "/api/v1/pharmacist/ai/expiry-report",
    { method: "POST", body: JSON.stringify({ warning_days: warningDays }) },
  );
}

export function pharmacistInternalChatRequest(
  accessToken: string,
  message: string,
): Promise<PharmacistAITextResponse> {
  return requestJson<PharmacistAITextResponse>(
    accessToken,
    "/api/v1/pharmacist/ai/internal-chat",
    { method: "POST", body: JSON.stringify({ message }) },
  );
}
