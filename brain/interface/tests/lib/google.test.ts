import { describe, it, expect } from "vitest";
import { isTokenExpired } from "@/lib/google";

describe("isTokenExpired", () => {
  it("returns true when expiresAt is in the past", () => {
    const pastDate = new Date(Date.now() - 60000); // 1 minute ago
    expect(isTokenExpired(pastDate)).toBe(true);
  });

  it("returns false when expiresAt is in the future", () => {
    const futureDate = new Date(Date.now() + 60000); // 1 minute from now
    expect(isTokenExpired(futureDate)).toBe(false);
  });

  it("returns true when expiresAt is null", () => {
    expect(isTokenExpired(null)).toBe(true);
  });
});
