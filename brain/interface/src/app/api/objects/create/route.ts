import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const trimmed = content.trim();

  // Detect if it's a URL
  const isUrl = /^https?:\/\/\S+$/i.test(trimmed);

  const subject = isUrl
    ? trimmed
    : trimmed.length > 100
      ? trimmed.slice(0, 100) + "..."
      : trimmed;

  const object = await prisma.emailObject.create({
    data: {
      gmailId: `manual-${crypto.randomUUID()}`,
      userId: auth.userId,
      subject,
      senderName: "You",
      senderEmail: auth.email,
      bodyText: trimmed,
      receivedAt: new Date(),
      gmailUrl: isUrl ? trimmed : "",
      status: "INBOX",
    },
  });

  return NextResponse.json({ success: true, id: object.id });
}
