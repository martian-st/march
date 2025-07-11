import { Objects } from "@/types/objects";
import Editor from "../editor/editor";
import React from "react";
import { useDeleteObject, useUpdateObject } from "@/hooks/use-objects";
import { debounce } from "lodash";
import { TitleTextarea } from "./title-textarea";
import { Button } from "../ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { JSONContent } from "novel";

interface ExpandedViewProps {
  item: Objects;
  onClose: () => void;
}

export default function ExpandedView({ item, onClose }: ExpandedViewProps) {
  const { mutate: updateObject } = useUpdateObject();
  const { mutate: deleteObject } = useDeleteObject();

  const debouncedSave = React.useCallback(
    debounce((content: string) => {
      updateObject({
        _id: item._id,
        description: content,
      });
    }, 1000),
    [item._id, updateObject]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const getInitialContent = () => {
    if (!item.description) return defaultValue;

    try {
      // Parse stored JSON string
      return typeof item.description === "string"
        ? JSON.parse(item.description)
        : item.description;
    } catch {
      // Fallback for any non-JSON content
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: String(item.description) }],
          },
        ],
      };
    }
  };

  const handleDelete = () => {
    deleteObject({ _id: item._id });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Title */}
          <div className="mb-6">
            <TitleTextarea
              title={item.title}
              setTitle={(title) => {
                updateObject({ _id: item._id, title });
              }}
            />
          </div>

          {/* Editor */}
          <div className="prose prose-lg max-w-none">
            <Editor
              initialValue={getInitialContent()}
              onChange={debouncedSave}
              placeholder="Start writing..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const defaultValue: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [],
    },
  ],
};
