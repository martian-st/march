import { formatDate } from "@/lib/utils";
import type { EmailObject } from "@/generated/prisma/client";

export function ObjectDetail({ object }: { object: EmailObject }) {
  return (
    <div>
      <h1 className="text-lg font-medium text-gray-900 mb-3">{object.subject}</h1>

      <div className="flex items-center gap-2 text-sm mb-1">
        <span className="font-medium text-gray-900">
          {object.senderName}
        </span>
        <span className="text-gray-400">&lt;{object.senderEmail}&gt;</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-8">
        <span>{formatDate(object.receivedAt)}</span>
        <a
          href={object.gmailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-900 transition-colors"
        >
          View in Gmail
        </a>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {object.bodyText || "No content available."}
        </div>
      </div>
    </div>
  );
}
