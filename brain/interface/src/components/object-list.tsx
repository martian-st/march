import { ObjectRow } from "./object-row";
import { EmptyState } from "./empty-state";
import type { EmailObjectListItem } from "@/types";

const EMPTY_MESSAGES: Record<string, string> = {
  INBOX: "No emails in inbox. Sync to fetch new messages.",
  LATER: "No emails marked for later.",
  ARCHIVED: "No archived emails.",
};

export function ObjectList({
  objects,
  status,
}: {
  objects: EmailObjectListItem[];
  status: string;
}) {
  if (objects.length === 0) {
    return <EmptyState message={EMPTY_MESSAGES[status] || "No emails."} />;
  }

  return (
    <div className="divide-y divide-gray-100">
      {objects.map((object) => (
        <ObjectRow key={object.id} object={object} />
      ))}
    </div>
  );
}
