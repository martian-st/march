import { google, type gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getValidAccessToken } from "./google";

// --- Gmail Client ---

export async function getGmailClient(
  userId: string
): Promise<gmail_v1.Gmail> {
  const accessToken = await getValidAccessToken(userId);
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

// --- Labels ---

// Cache label IDs per session to avoid repeated API calls
const labelCache = new Map<string, string>();

export async function getOrCreateLabel(
  gmail: gmail_v1.Gmail,
  labelName: string
): Promise<string> {
  const cacheKey = labelName;
  const cached = labelCache.get(cacheKey);
  if (cached) return cached;

  // Check if label already exists
  const existing = await gmail.users.labels.list({ userId: "me" });
  const found = existing.data.labels?.find((l) => l.name === labelName);

  if (found?.id) {
    labelCache.set(cacheKey, found.id);
    return found.id;
  }

  // Create the label
  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });

  const labelId = created.data.id!;
  labelCache.set(cacheKey, labelId);
  return labelId;
}

// --- Send to Gmail ---

export async function sendToGmail(
  gmail: gmail_v1.Gmail,
  email: string,
  subject: string,
  body: string,
  labelName: string
): Promise<string> {
  // Build RFC 2822 email
  const rawMessage = [
    `From: ${email}`,
    `To: ${email}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    "",
    body,
  ].join("\r\n");

  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Send the email
  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });

  const messageId = sent.data.id!;

  // Apply the label
  const labelId = await getOrCreateLabel(gmail, labelName);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
    },
  });

  return messageId;
}
