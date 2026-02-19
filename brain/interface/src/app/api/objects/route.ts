import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EmailStatus } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const statusParam = (searchParams.get("status") || "INBOX").toUpperCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

  // Validate status
  if (!Object.values(EmailStatus).includes(statusParam as EmailStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const status = statusParam as EmailStatus;
  const skip = (page - 1) * limit;

  const [objects, total] = await Promise.all([
    prisma.emailObject.findMany({
      where: { userId: auth.userId, status },
      orderBy: { receivedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        subject: true,
        senderName: true,
        senderEmail: true,
        receivedAt: true,
        status: true,
        bodyText: true,
      },
    }),
    prisma.emailObject.count({
      where: { userId: auth.userId, status },
    }),
  ]);

  return NextResponse.json({ objects, total, page });
}
