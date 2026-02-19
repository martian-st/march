import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { getGmailClient } from "@/lib/gmail";
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

  // Get the user's email from GmailTokens
  const tokens = await prisma.gmailTokens.findUnique({
    where: { userId: auth.userId },
    select: { email: true },
  });

  if (!tokens) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  const gmail = await getGmailClient(auth.userId);

  // Build the date for the subject
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `Note — ${today}`;

  // Build RFC 2822 email message
  const rawMessage = [
    `From: ${tokens.email}`,
    `To: ${tokens.email}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    "",
    content,
  ].join("\r\n");

  // Base64url encode
  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    return NextResponse.json({ success: true, subject });
  } catch (error) {
    console.error("Failed to send note:", error);
    return NextResponse.json({ error: "Failed to send note" }, { status: 500 });
  }
}
