// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers (not available outside Next.js)
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock environment
vi.stubEnv("SESSION_SECRET", "test-secret-that-is-at-least-32-chars-long");

import { createSessionToken, verifySessionToken } from "@/lib/session";

describe("createSessionToken", () => {
  it("generates a valid JWT string", async () => {
    const token = await createSessionToken("user-123", "test@example.com");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });
});

describe("verifySessionToken", () => {
  it("returns payload for valid token", async () => {
    const token = await createSessionToken("user-123", "test@example.com");
    const payload = await verifySessionToken(token);
    expect(payload.sub).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
  });

  it("throws for tampered token", async () => {
    const token = await createSessionToken("user-123", "test@example.com");
    const tampered = token.slice(0, -5) + "XXXXX";
    await expect(verifySessionToken(tampered)).rejects.toThrow();
  });

  it("throws for completely invalid token", async () => {
    await expect(verifySessionToken("not-a-jwt")).rejects.toThrow();
  });

  it("throws for empty string", async () => {
    await expect(verifySessionToken("")).rejects.toThrow();
  });
});
