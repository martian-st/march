import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/session", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as getMe } from "@/app/api/auth/me/route";

const mockUser = { userId: "user-123", email: "test@example.com" };

describe("POST /api/auth/logout", () => {
  it("returns success and clears cookie", async () => {
    const res = await logout();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const res = await getMe();
    expect(res.status).toBe(401);
  });

  it("returns user data with valid session", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: null,
    } as any);

    const res = await getMe();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.email).toBe("test@example.com");
    expect(data.user.name).toBe("Test User");
  });

  it("returns 404 if user not found in DB", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await getMe();
    expect(res.status).toBe(404);
  });
});
