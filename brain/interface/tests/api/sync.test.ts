import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/session", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/gmail", () => ({
  syncEmails: vi.fn(),
}));

import { getAuthenticatedUser } from "@/lib/session";
import { syncEmails } from "@/lib/gmail";
import { POST } from "@/app/api/gmail/sync/route";

const mockUser = { userId: "user-123", email: "test@example.com" };

describe("POST /api/gmail/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns synced count on success", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(syncEmails).mockResolvedValue({ synced: 5, errors: 0 });

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.synced).toBe(5);
    expect(data.errors).toBe(0);
  });

  it("returns 500 on Gmail API error", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(syncEmails).mockRejectedValue(new Error("Gmail API rate limit"));

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Gmail API rate limit");
  });

  it("handles non-Error thrown values", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(syncEmails).mockRejectedValue("unknown error");

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to sync emails");
  });
});
