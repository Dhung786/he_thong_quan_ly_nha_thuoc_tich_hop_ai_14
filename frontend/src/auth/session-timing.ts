export const DEFAULT_REFRESH_EARLY_MS = 60_000;
export const DEFAULT_MIN_REFRESH_DELAY_MS = 1_000;

export function accessExpiryFromLifetime(
  nowMs: number,
  expiresInSeconds: number,
): number {
  return nowMs + Math.max(0, expiresInSeconds) * 1_000;
}

export function secondsUntilExpiry(expiresAtMs: number, nowMs: number): number {
  if (!Number.isFinite(expiresAtMs)) return 0;
  return Math.max(0, Math.floor((expiresAtMs - nowMs) / 1_000));
}

export function refreshDelayMs(
  expiresAtMs: number,
  nowMs: number,
  earlyMs = DEFAULT_REFRESH_EARLY_MS,
  minimumDelayMs = DEFAULT_MIN_REFRESH_DELAY_MS,
): number {
  return Math.max(minimumDelayMs, expiresAtMs - nowMs - earlyMs);
}
