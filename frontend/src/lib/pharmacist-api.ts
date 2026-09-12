import { apiBaseUrl, ApiError, type Medicine } from "./api";
import type {
  ExpiryRow,
  InventoryRow,
  Invoice,
  MedicineBatch,
  ReportSummary,
} from "./manager-api";

interface ErrorEnvelope {
  error?: unknown;
  message?: unknown;
  correlation_id?: unknown;
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
  return requestJson<Medicine[]>(accessToken, `/api/v1/lookup/medicines${suffix}`);
}

export function pharmacistBatchesRequest(accessToken: string): Promise<MedicineBatch[]> {
  return requestJson<MedicineBatch[]>(accessToken, "/api/v1/batches");
}

export function pharmacistInventoryRequest(
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

export function pharmacistExpiringRequest(
  accessToken: string,
  withinDays: number,
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

export function pharmacistReportSummaryRequest(
  accessToken: string,
  expiryWithinDays: number,
): Promise<ReportSummary> {
  return requestJson<ReportSummary>(
    accessToken,
    `/api/v1/pharmacist/reports/summary?expiry_within_days=${expiryWithinDays}`,
  );
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
