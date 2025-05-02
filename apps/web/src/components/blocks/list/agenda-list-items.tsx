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
import { Objects } from "@/types/objects";
import { Star } from "lucide-react";

interface AgendaListItemsProps {
  onDragStateChange?: (isDragging: boolean) => void;
}

export function AgendaListItems({ onDragStateChange }: AgendaListItemsProps) {
  const { items, overdueItems } = useBlock();

  const { mutate: updateObject } = useUpdateObject();

  // Ensure items and overdueItems are arrays before sorting
  const itemsArray = Array.isArray(items) ? items : [];
  const overdueItemsArray = Array.isArray(overdueItems) ? overdueItems : [];

  // Sort items by order property
  const sortedTodayItems = [...itemsArray].sort((a, b) => b.order - a.order);
  const sortedOverdueItems = [...overdueItemsArray].sort((a, b) => b.order - a.order);

  // Check if there are no items to display
  if (sortedTodayItems.length === 0 && sortedOverdueItems.length === 0) {
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

  // Function to render a single item
  const renderItem = (item: Objects, index: number, isOverdue: boolean = false) => {
    return (
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
                <div className="flex items-center gap-2 relative">
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
                  {isOverdue && (
                    <div className="absolute -right-7">
                      <Star size={14} className="fill-red-500 text-red-500" />
                    </div>
                  )}
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
    );
  };

  return (
    <div className="space-y-2">
      {/* Render overdue items section if there are any */}
      {sortedOverdueItems.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-red-600">Overdue</h3>
          <SortableContext
            items={sortedOverdueItems.map((item) => item._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {sortedOverdueItems.map((item, index) => renderItem(item, index, true))}
            </div>
          </SortableContext>
        </div>
      )}

      {/* Today's scheduled items */}
      {sortedTodayItems.length > 0 && (
        <div>
          {sortedOverdueItems.length > 0 && (
            <h3 className="text-sm font-medium mb-2 mt-4">Today</h3>
          )}
          <SortableContext
            items={sortedTodayItems.map((item) => item._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {sortedTodayItems.map((item, index) => renderItem(item, index))}            
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
}
