"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import type { EmailStatus } from "@/types";
import { VALID_TRANSITIONS } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  INBOX: "Inbox",
  LATER: "Later",
  ARCHIVED: "Archive",
};

export function StatusActions({
  objectId,
  currentStatus,
}: {
  objectId: string;
  currentStatus: EmailStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (newStatus: EmailStatus) => {
    const res = await fetch(`/api/objects/${objectId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  return (
    <div className={cn("flex items-center gap-1", isPending && "opacity-50")}>
      {allowedTransitions.map((status) => (
        <button
          key={status}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStatusChange(status);
          }}
          disabled={isPending}
          className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}
