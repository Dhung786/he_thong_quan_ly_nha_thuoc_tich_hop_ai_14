import { apiBaseUrl, ApiError } from "./api";

export interface CashierMedicine {
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

export interface CashierInventoryRow {
  batch_id: number;
  batch_code: string;
  medicine_id: number;
  medicine_code: string;
  medicine_name: string;
  quantity_remaining: number;
  expiry_date: string;
  selling_price: string;
}

export interface CashierInvoiceItem {
  id: number;
  medicine_id: number;
  medicine_name: string;
  batch_id: number;
  batch_code: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface CashierInvoice {
  id: number;
  code: string;
  status: string;
  total_amount: string;
  created_by_user_id: number;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  items: CashierInvoiceItem[];
}

export interface CashierAIResponse {
  answer: string;
  provider: string;
  model: string | null;
  scope_guard: string;
  disclaimer: string;
}

interface ErrorEnvelope {
  error?: unknown;
  message?: unknown;
  correlation_id?: unknown;
}

async function buildApiError(response: Response): Promise<ApiError> {
  let body: ErrorEnvelope | null = null;
  try {
    body = (await response.json()) as ErrorEnvelope;
  } catch {
    body = null;
  }
  const code = typeof body?.error === "string" ? body.error : null;
  const message = typeof body?.message === "string" ? body.message : `Request failed with status ${response.status}`;
  const correlationId = typeof body?.correlation_id === "string" ? body.correlation_id : response.headers.get("X-Correlation-ID");
  return new ApiError(response.status, message, code, correlationId);
}

async function requestJson<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
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

export function cashierMedicinesRequest(accessToken: string, q = ""): Promise<CashierMedicine[]> {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson<CashierMedicine[]>(accessToken, `/api/v1/cashier/medicines${suffix}`);
}

export function cashierInventoryRequest(accessToken: string): Promise<CashierInventoryRow[]> {
  return requestJson<CashierInventoryRow[]>(accessToken, "/api/v1/cashier/inventory");
}

export function cashierInvoicesRequest(accessToken: string): Promise<CashierInvoice[]> {
  return requestJson<CashierInvoice[]>(accessToken, "/api/v1/cashier/invoices");
}

export function cashierCreateInvoiceRequest(
  accessToken: string,
  payload: { code: string; items: Array<{ batch_id: number; quantity: number }> },
): Promise<CashierInvoice> {
  return requestJson<CashierInvoice>(accessToken, "/api/v1/cashier/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cashierFinalizeInvoiceRequest(accessToken: string, invoiceId: number): Promise<CashierInvoice> {
  return requestJson<CashierInvoice>(accessToken, `/api/v1/cashier/invoices/${invoiceId}/finalize`, { method: "POST" });
}

export function cashierCancelInvoiceRequest(accessToken: string, invoiceId: number): Promise<CashierInvoice> {
  return requestJson<CashierInvoice>(accessToken, `/api/v1/cashier/invoices/${invoiceId}/cancel`, { method: "POST" });
}

export function cashierAssistantRequest(accessToken: string, message: string): Promise<CashierAIResponse> {
  return requestJson<CashierAIResponse>(accessToken, "/api/v1/cashier/assistant", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
