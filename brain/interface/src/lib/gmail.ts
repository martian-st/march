import { google, type gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";
import { getValidAccessToken } from "./google";
import type { ParsedSender, SyncResult } from "@/types";

// --- Gmail Client ---

export async function getGmailClient(
  userId: string
): Promise<gmail_v1.Gmail> {
  const accessToken = await getValidAccessToken(userId);
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

// --- Message Fetching ---

export async function fetchMessageIds(
  gmail: gmail_v1.Gmail,
  maxResults: number = 50
): Promise<string[]> {
  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    labelIds: ["INBOX"],
  });

  return (response.data.messages || [])
    .map((msg) => msg.id)
    .filter((id): id is string => id !== null && id !== undefined);
}

export async function fetchFullMessage(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<gmail_v1.Schema$Message> {
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });
  return response.data;
}

// --- Parsing ---

export function parseSenderField(from: string): ParsedSender {
  // Handle formats:
  //   "Display Name <email@example.com>"
  //   "<email@example.com>"
  //   "email@example.com"
  //   '"Last, First" <email@example.com>'
  const match = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    const name = (match[1] || "").trim();
    const email = match[2].trim();
    return { name: name || email, email };
  }
  return { name: from.trim(), email: from.trim() };
}

export function parseEmailHeaders(
  headers: gmail_v1.Schema$MessagePartHeader[]
): {
  subject: string;
  from: string;
  date: string;
  messageId: string;
  references: string;
} {
  const get = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    "";

  return {
    subject: get("Subject") || "No Subject",
    from: get("From") || "Unknown Sender",
    date: get("Date") || "",
    messageId: get("Message-ID") || "",
    references: get("References") || "",
  };
}

export function parseEmailBody(
  payload: gmail_v1.Schema$MessagePart | undefined
): string {
  if (!payload) return "";

  let plainTextContent: string | null = null;

  function extractText(part: gmail_v1.Schema$MessagePart): void {
    if (part.mimeType === "text/plain" && part.body?.data) {
      plainTextContent = Buffer.from(part.body.data, "base64url").toString(
        "utf-8"
      );
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        extractText(subPart);
      }
    }
  }

  if (payload.mimeType === "multipart/alternative" && payload.parts) {
    for (const part of payload.parts) {
      extractText(part);
    }
  } else {
    extractText(payload);
  }

  return (plainTextContent || "").trim();
}

// --- Upsert ---

async function upsertEmailObject(
  message: gmail_v1.Schema$Message,
  userId: string
): Promise<boolean> {
  const gmailId = message.id;
  if (!gmailId) return false;

  const headers = parseEmailHeaders(message.payload?.headers || []);
  const sender = parseSenderField(headers.from);
  const bodyText = parseEmailBody(message.payload);
  const receivedAt = message.internalDate
    ? new Date(parseInt(message.internalDate))
    : new Date();
  const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${gmailId}`;

  await prisma.emailObject.upsert({
    where: { gmailId },
    create: {
      gmailId,
      userId,
      subject: headers.subject,
      senderName: sender.name,
      senderEmail: sender.email,
      bodyText,
      receivedAt,
      gmailUrl,
      status: "INBOX",
      metadata: {
        threadId: message.threadId || null,
        messageId: headers.messageId,
        references: headers.references,
        snippet: message.snippet || "",
        labelIds: message.labelIds || [],
      },
    },
    update: {}, // Don't overwrite existing objects
  });

  return true;
}

// --- Sync Orchestrator ---

async function syncInitial(
  gmail: gmail_v1.Gmail,
  userId: string
): Promise<SyncResult> {
  let synced = 0;
  let errors = 0;

  const messageIds = await fetchMessageIds(gmail, 50);

  for (const id of messageIds) {
    try {
      const message = await fetchFullMessage(gmail, id);
      const created = await upsertEmailObject(message, userId);
      if (created) synced++;
    } catch (err) {
      console.error(`Failed to sync message ${id}:`, err);
      errors++;
    }
  }

  // Store the current historyId for future incremental syncs
  const profile = await gmail.users.getProfile({ userId: "me" });
  if (profile.data.historyId) {
    await prisma.gmailTokens.update({
      where: { userId },
      data: { historyId: profile.data.historyId },
    });
  }

  return { synced, errors };
}

async function syncIncremental(
  gmail: gmail_v1.Gmail,
  userId: string,
  historyId: string
): Promise<SyncResult> {
  let synced = 0;
  let errors = 0;

  try {
    const historyResponse = await gmail.users.history.list({
      userId: "me",
      startHistoryId: historyId,
      historyTypes: ["messageAdded"],
      labelId: "INBOX",
    });

    if (historyResponse.data.history) {
      for (const record of historyResponse.data.history) {
        if (record.messagesAdded) {
          for (const added of record.messagesAdded) {
            const messageId = added.message?.id;
            if (!messageId) continue;

            try {
              const message = await fetchFullMessage(gmail, messageId);
              const created = await upsertEmailObject(message, userId);
              if (created) synced++;
            } catch (err) {
              console.error(`Failed to sync message ${messageId}:`, err);
              errors++;
            }
          }
        }
      }
    }

    // Update historyId for next sync
    const newHistoryId = historyResponse.data.historyId;
    if (newHistoryId) {
      await prisma.gmailTokens.update({
        where: { userId },
        data: { historyId: newHistoryId },
      });
    }
  } catch (err: unknown) {
    // If history ID is expired/invalid (404), fall back to initial sync
    const isHistoryError =
      err instanceof Error &&
      (err.message.includes("404") || err.message.includes("historyId"));

    if (isHistoryError) {
      console.warn("History ID expired, falling back to initial sync");
      return syncInitial(gmail, userId);
    }
    throw err;
  }

  return { synced, errors };
}

export async function syncEmails(userId: string): Promise<SyncResult> {
  const gmail = await getGmailClient(userId);
  const tokens = await prisma.gmailTokens.findUnique({
    where: { userId },
  });

  if (!tokens) {
    throw new Error("No Gmail tokens found — please connect Gmail first");
  }

  if (tokens.historyId) {
    return syncIncremental(gmail, userId, tokens.historyId);
  }

  return syncInitial(gmail, userId);
}
