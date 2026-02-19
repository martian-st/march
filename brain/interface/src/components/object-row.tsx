"use client";

import Link from "next/link";
import { timeAgo, truncate } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import type { EmailObjectListItem } from "@/types";

export function ObjectRow({ object }: { object: EmailObjectListItem }) {
  return (
    <Link
      href={`/object/${object.id}`}
      className="group flex items-start justify-between gap-4 py-3 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 truncate">
            {object.senderName}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {timeAgo(object.receivedAt)}
          </span>
        </div>
        <p className="text-sm text-gray-700 truncate">{object.subject}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {truncate(object.bodyText, 120)}
        </p>
      </div>

      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <StatusActions objectId={object.id} currentStatus={object.status} />
      </div>
    </Link>
  );
}
