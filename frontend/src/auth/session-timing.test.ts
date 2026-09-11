import { describe, expect, it } from "vitest";

import {
  accessExpiryFromLifetime,
  refreshDelayMs,
  secondsUntilExpiry,
} from "./session-timing";

describe("auth session timing", () => {
  it("converts token lifetime seconds into an absolute expiry", () => {
    expect(accessExpiryFromLifetime(1_000_000, 1_800)).toBe(2_800_000);
  });

  it("calculates remaining whole seconds and clamps expired tokens", () => {
    expect(secondsUntilExpiry(2_800_500, 1_000_000)).toBe(1_800);
    expect(secondsUntilExpiry(999_000, 1_000_000)).toBe(0);
    expect(secondsUntilExpiry(Number.NaN, 1_000_000)).toBe(0);
  });

  it("schedules refresh one minute before expiry by default", () => {
    const now = 1_000_000;
    const expiresAt = accessExpiryFromLifetime(now, 1_800);

    expect(refreshDelayMs(expiresAt, now)).toBe(1_740_000);
  });

  it("uses a short bounded delay when token is already near expiry", () => {
    expect(refreshDelayMs(1_030_000, 1_000_000)).toBe(1_000);
  });
});
