import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { VALID_TRANSITIONS } from "@/types";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailObject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock session
vi.mock("@/lib/session", () => ({
  getAuthenticatedUser: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

// Import route handlers
import { GET as listObjects } from "@/app/api/objects/route";
import { GET as getObject } from "@/app/api/objects/[id]/route";
import { PATCH as updateStatus } from "@/app/api/objects/[id]/status/route";

const mockUser = { userId: "user-123", email: "test@example.com" };

const mockObject = {
  id: "obj-1",
  gmailId: "gmail-1",
  userId: "user-123",
  subject: "Test Email",
  senderName: "John",
  senderEmail: "john@example.com",
  bodyText: "Hello",
  receivedAt: new Date(),
  gmailUrl: "https://mail.google.com",
  metadata: null,
  status: "INBOX" as const,
  statusChangedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(`http://localhost:3000${url}`, options);
}

describe("GET /api/objects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const res = await listObjects(createRequest("/api/objects"));
    expect(res.status).toBe(401);
  });

  it("returns INBOX objects by default", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findMany).mockResolvedValue([mockObject] as any);
    vi.mocked(prisma.emailObject.count).mockResolvedValue(1);

    const res = await listObjects(createRequest("/api/objects"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.objects).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(vi.mocked(prisma.emailObject.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123", status: "INBOX" },
      })
    );
  });

  it("returns LATER objects when status=LATER", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findMany).mockResolvedValue([]);
    vi.mocked(prisma.emailObject.count).mockResolvedValue(0);

    const res = await listObjects(createRequest("/api/objects?status=LATER"));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.emailObject.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123", status: "LATER" },
      })
    );
  });

  it("returns 400 for invalid status", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    const res = await listObjects(
      createRequest("/api/objects?status=INVALID")
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/objects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const res = await getObject(createRequest("/api/objects/obj-1"), {
      params: Promise.resolve({ id: "obj-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns the object", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findUnique).mockResolvedValue(mockObject as any);

    const res = await getObject(createRequest("/api/objects/obj-1"), {
      params: Promise.resolve({ id: "obj-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.object.id).toBe("obj-1");
  });

  it("returns 404 for non-existent ID", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findUnique).mockResolvedValue(null);

    const res = await getObject(createRequest("/api/objects/nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/objects/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const res = await updateStatus(
      createRequest("/api/objects/obj-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LATER" }),
      }),
      { params: Promise.resolve({ id: "obj-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("transitions INBOX to LATER", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findUnique).mockResolvedValue(mockObject as any);
    vi.mocked(prisma.emailObject.update).mockResolvedValue({
      ...mockObject,
      status: "LATER",
    } as any);

    const res = await updateStatus(
      createRequest("/api/objects/obj-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LATER" }),
      }),
      { params: Promise.resolve({ id: "obj-1" }) }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.object.status).toBe("LATER");
  });

  it("transitions INBOX to ARCHIVED", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findUnique).mockResolvedValue(mockObject as any);
    vi.mocked(prisma.emailObject.update).mockResolvedValue({
      ...mockObject,
      status: "ARCHIVED",
    } as any);

    const res = await updateStatus(
      createRequest("/api/objects/obj-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      }),
      { params: Promise.resolve({ id: "obj-1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("transitions LATER to INBOX", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findUnique).mockResolvedValue({
      ...mockObject,
      status: "LATER",
    } as any);
    vi.mocked(prisma.emailObject.update).mockResolvedValue({
      ...mockObject,
      status: "INBOX",
    } as any);

    const res = await updateStatus(
      createRequest("/api/objects/obj-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INBOX" }),
      }),
      { params: Promise.resolve({ id: "obj-1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("transitions ARCHIVED to INBOX", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findUnique).mockResolvedValue({
      ...mockObject,
      status: "ARCHIVED",
    } as any);
    vi.mocked(prisma.emailObject.update).mockResolvedValue({
      ...mockObject,
      status: "INBOX",
    } as any);

    const res = await updateStatus(
      createRequest("/api/objects/obj-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INBOX" }),
      }),
      { params: Promise.resolve({ id: "obj-1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("rejects ARCHIVED to LATER (invalid transition)", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findUnique).mockResolvedValue({
      ...mockObject,
      status: "ARCHIVED",
    } as any);

    const res = await updateStatus(
      createRequest("/api/objects/obj-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LATER" }),
      }),
      { params: Promise.resolve({ id: "obj-1" }) }
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Cannot transition");
  });

  it("returns 400 for invalid status value", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);

    const res = await updateStatus(
      createRequest("/api/objects/obj-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELETED" }),
      }),
      { params: Promise.resolve({ id: "obj-1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent object", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(mockUser);
    vi.mocked(prisma.emailObject.findUnique).mockResolvedValue(null);

    const res = await updateStatus(
      createRequest("/api/objects/nonexistent/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "LATER" }),
      }),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("VALID_TRANSITIONS", () => {
  it("allows INBOX -> LATER and ARCHIVED", () => {
    expect(VALID_TRANSITIONS.INBOX).toEqual(["LATER", "ARCHIVED"]);
  });

  it("allows LATER -> INBOX and ARCHIVED", () => {
    expect(VALID_TRANSITIONS.LATER).toEqual(["INBOX", "ARCHIVED"]);
  });

  it("allows ARCHIVED -> INBOX only", () => {
    expect(VALID_TRANSITIONS.ARCHIVED).toEqual(["INBOX"]);
  });
});
