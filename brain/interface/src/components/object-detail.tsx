import { formatDate } from "@/lib/utils";
import type { EmailObject } from "@/generated/prisma";

export function ObjectDetail({ object }: { object: EmailObject }) {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">{object.subject}</h1>

      <div className="flex items-center gap-3 text-sm text-muted mb-1">
        <span className="font-medium text-foreground">
          {object.senderName}
        </span>
        <span>&lt;{object.senderEmail}&gt;</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted mb-6">
        <span>{formatDate(object.receivedAt)}</span>
        <a
          href={object.gmailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          View in Gmail
        </a>
      </div>

      <div className="border-t border-border pt-4">
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {object.bodyText || "No content available."}
        </div>
      </div>
    </div>
  );
}
