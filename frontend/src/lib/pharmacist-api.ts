import { apiBaseUrl, ApiError, type Medicine } from "./api";

interface ErrorEnvelope {
  error?: unknown;
  message?: unknown;
  correlation_id?: unknown;
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

export async function pharmacistMedicineLookupRequest(
  accessToken: string,
  query = "",
): Promise<Medicine[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${apiBaseUrl}/api/v1/lookup/medicines${suffix}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw await buildApiError(response);
  return response.json() as Promise<Medicine[]>;
}
