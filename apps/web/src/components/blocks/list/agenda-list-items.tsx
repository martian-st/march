"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./sortable-item";
import { useBlock } from "@/contexts/block-context";
import { useUpdateObject } from "@/hooks/use-objects";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import ExpandedView from "@/components/object/expanded-view";
import { Icons } from "@/components/ui/icons";

interface AgendaListItemsProps {
  onDragStateChange?: (isDragging: boolean) => void;
}

export function AgendaListItems({ onDragStateChange }: AgendaListItemsProps) {
  const { items } = useBlock();

  const { mutate: updateObject } = useUpdateObject();

  // Sort items by order property
  const sortedItems = [...items].sort((a, b) => b.order - a.order);

  if (sortedItems.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500 text-sm">
        No scheduled objects
      </div>
    );
  }

  const renderIcon = (source: string) => {
    // Map source to icon name in Icons component
    const iconMap: { [key: string]: keyof typeof Icons } = {
      gmail: "gmail",
      linear: "linear",
      github: "gitHub",
      calendar: "calendar",
      twitter: "twitter",
    };

    const iconName = iconMap[source.toLowerCase()];
    if (!iconName) return null;

    const Icon = Icons[iconName];
    return <Icon className="h-3 w-3 ml-2 inline-block text-gray-500" />;
  };

  return (
    <SortableContext
      items={sortedItems.map((item) => item._id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="space-y-0.5">
        {sortedItems.map((item, index) => (
          <SortableItem
            key={item._id}
            id={item._id}
            item={{
              _id: item._id,
              text: item.title,
              checked: item.isCompleted,
            }}
            containerId="list-container"
            data={{
              type: "list-item",
              text: item.title,
              checked: item.isCompleted,
              id: item._id,
            }}
            index={index}
            onDragStateChange={onDragStateChange}
          >
            <div className="flex items-center w-full py-2 px-1 rounded-md hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-2 w-full">
                <div
                  className="flex items-center justify-center"
                  style={{ width: "18px" }}
                >
                  <Checkbox
                    id={`item-${item._id}`}
                    className={cn(
                      "h-[18px] w-[18px] border-gray-300",
                      "transition-all duration-200",
                      item.isCompleted
                        ? "opacity-100"
                        : "opacity-70 group-hover:opacity-100",
                    )}
                    checked={item.isCompleted}
                    onCheckedChange={() => {
                      updateObject({
                        _id: item._id,
                        isCompleted: !item.isCompleted,
                      });
                    }}
                  />
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <div
                      className={cn(
                        "text-sm cursor-pointer select-none",
                        item.isCompleted
                          ? "text-gray-400 line-through"
                          : "text-gray-700",
                      )}
                    >
                      {item.title}
                    </div>
                  </SheetTrigger>
                  <span onClick={(e) => e.stopPropagation()}>
                    {item.source ? (
                      <a href={item.metadata?.url} target="_blank">
                        {item.source !== "march" && renderIcon(item.source)}
                      </a>
                    ) : (
                      <div></div>
                    )}
                  </span>
                  <ExpandedView item={item} />
                </Sheet>
              </div>
            </div>
            <Separator className="last:hidden opacity-20 my-0" />
          </SortableItem>
        ))}
      </div>
    </SortableContext>
  );
}
