import type { EmailStatus } from "@/generated/prisma/enums";

export type { EmailStatus };

export interface SessionPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface SyncResult {
  synced: number;
  errors: number;
}

export interface ParsedSender {
  name: string;
  email: string;
}

export interface EmailObjectListItem {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  receivedAt: Date;
  status: EmailStatus;
  bodyText: string;
}

export const VALID_TRANSITIONS: Record<EmailStatus, EmailStatus[]> = {
  INBOX: ["LATER", "ARCHIVED"],
  LATER: ["INBOX", "ARCHIVED"],
  ARCHIVED: ["INBOX"],
};
