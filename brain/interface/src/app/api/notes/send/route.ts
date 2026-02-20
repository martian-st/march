import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { getGmailClient, sendToGmail } from "@/lib/gmail";
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

  const tokens = await prisma.gmailTokens.findUnique({
    where: { userId: auth.userId },
    select: { email: true },
  });

  if (!tokens) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `Note — ${today}`;

  try {
    const gmail = await getGmailClient(auth.userId);
    const gmailMessageId = await sendToGmail(
      gmail,
      tokens.email,
      subject,
      content.trim(),
      "march_today"
    );

    // Store locally
    await prisma.emailObject.create({
      data: {
        gmailId: gmailMessageId,
        userId: auth.userId,
        subject,
        senderName: "You",
        senderEmail: tokens.email,
        bodyText: content.trim(),
        receivedAt: new Date(),
        gmailUrl: `https://mail.google.com/mail/u/0/#inbox/${gmailMessageId}`,
        status: "INBOX",
        metadata: { label: "march_today" },
      },
    });

    return NextResponse.json({ success: true, subject });
  } catch (error) {
    console.error("Failed to send note:", error);
    return NextResponse.json({ error: "Failed to send note" }, { status: 500 });
  }
}
