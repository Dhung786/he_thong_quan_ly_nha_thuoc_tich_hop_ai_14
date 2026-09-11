import { apiBaseUrl } from "./api";

export interface ManagerAIStatus {
  provider: string;
  model: string | null;
  configured: boolean;
  scope_guard: string;
}

export interface ManagerAITextResponse {
  answer: string;
  provider: string;
  model: string | null;
  scope_guard: string;
  disclaimer: string;
}

async function request<T>(
  path: string,
  accessToken: string,
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

  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string") message = body.message;
    } catch {
      // Keep the safe fallback message.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function managerAIStatusRequest(accessToken: string): Promise<ManagerAIStatus> {
  return request<ManagerAIStatus>("/api/v1/manager/ai/status", accessToken);
}

export function managerMedicineSummaryRequest(
  accessToken: string,
  medicineId: number,
): Promise<ManagerAITextResponse> {
  return request<ManagerAITextResponse>("/api/v1/manager/ai/medicine-summary", accessToken, {
    method: "POST",
    body: JSON.stringify({ medicine_id: medicineId }),
  });
}

export function managerExpiryAIReportRequest(
  accessToken: string,
  warningDays: number,
): Promise<ManagerAITextResponse> {
  return request<ManagerAITextResponse>("/api/v1/manager/ai/expiry-report", accessToken, {
    method: "POST",
    body: JSON.stringify({ warning_days: warningDays }),
  });
}

export function managerInternalChatRequest(
  accessToken: string,
  message: string,
): Promise<ManagerAITextResponse> {
  return request<ManagerAITextResponse>("/api/v1/manager/ai/internal-chat", accessToken, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
