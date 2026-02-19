"use client";

import Link from "next/link";
import { timeAgo, truncate } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import type { EmailObjectListItem } from "@/types";

export function ObjectRow({ object }: { object: EmailObjectListItem }) {
  return (
    <Link
      href={`/object/${object.id}`}
      className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border hover:bg-foreground/5 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {object.senderName}
          </span>
          <span className="text-xs text-muted flex-shrink-0">
            {timeAgo(object.receivedAt)}
          </span>
        </div>
        <p className="text-sm truncate">{object.subject}</p>
        <p className="text-xs text-muted truncate">
          {truncate(object.bodyText, 150)}
        </p>
      </div>

      <div className="flex-shrink-0">
        <StatusActions objectId={object.id} currentStatus={object.status} />
      </div>
    </Link>
  );
}
