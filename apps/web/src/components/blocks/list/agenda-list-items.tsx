"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./sortable-item";
import { useBlock } from "@/contexts/block-context";
import { useUpdateObject } from "@/hooks/use-objects";
import ExpandedView from "@/components/object/expanded-view";
import { Icons } from "@/components/ui/icons";
import { Objects } from "@/types/objects";
import { isToday, format, isPast, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/**
 * Convert a UTC date string to the user's timezone
 * This properly handles dates stored in the database (in UTC)
 * and displays them in the user's local timezone or the task's specified timezone
 */
const convertToTaskTimezone = (dateString: string, timezone: string | null): Date => {
  // Parse the ISO string to a Date object
  const date = parseISO(dateString);
  
  // Use the task's timezone if available, otherwise use the browser's timezone
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Convert the UTC date to the specified timezone
  return toZonedTime(date, tz);
};

interface AgendaListItemsProps {
  onDragStateChange?: (isDragging: boolean) => void;
}

export function AgendaListItems({ onDragStateChange }: AgendaListItemsProps) {
  const { items, overdueItems } = useBlock();
  const { mutate: updateObject } = useUpdateObject();
  const [expandedItem, setExpandedItem] = useState<Objects | null>(null);

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => a.order - b.order);
  }, [items]);

  const sortedOverdueItems = React.useMemo(() => {
    return [...overdueItems].sort((a, b) => a.order - b.order);
  }, [overdueItems]);

  const allSortedItems = [...sortedOverdueItems, ...sortedItems];

  const renderIcon = (source: string) => {
    const IconComponent = Icons[source as keyof typeof Icons];
    return IconComponent ? (
      <IconComponent className="w-3 h-3 opacity-50" />
    ) : null;
  };

  const handleItemClick = (item: Objects) => {
    setExpandedItem(item);
  };

  const handleCloseExpanded = () => {
    setExpandedItem(null);
  };

  if (expandedItem) {
    return (
      <ExpandedView 
        item={expandedItem} 
        onClose={handleCloseExpanded}
      />
    );
  }

  const renderItem = (item: Objects, isOverdue: boolean = false) => (
    <SortableItem
      key={item._id}
      id={item._id}
      item={{
        _id: item._id,
        text: item.title,
        checked: item.isCompleted,
      }}
      containerId="agenda-list-container"
      data={{
        type: "agenda-list-item",
        text: item.title,
        checked: item.isCompleted,
        id: item._id,
      }}
      index={allSortedItems.findIndex(i => i._id === item._id)}
      onDragStateChange={onDragStateChange}
    >
      <div className="flex items-center justify-between w-full group py-1">
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

          <div 
            onClick={() => handleItemClick(item)}
            className="flex items-center gap-2 relative cursor-pointer"
          >
            <div
              className={cn(
                "text-sm select-none",
                item.isCompleted
                  ? "text-gray-400 line-through"
                  : "text-gray-700",
              )}
            >
              {item.title}
            </div>
            {item.due && item.due.date && (
              <div className="ml-3 text-xs">
                {isOverdue ? (
                  <span className="text-red-500 font-medium">
                    {/* Convert UTC date to task's timezone */}
                    {format(convertToTaskTimezone(item.due.date, item.due.timezone), "MMM d")}
                  </span>
                ) : isToday(convertToTaskTimezone(item.due.date, item.due.timezone)) ? (
                  <span className="text-blue-500 font-medium">Today</span>
                ) : (
                  <span className="text-gray-500">
                    {/* Convert UTC date to task's timezone */}
                    {format(convertToTaskTimezone(item.due.date, item.due.timezone), "MMM d")}
                  </span>
                )}
              </div>
            )}
          </div>
          <span onClick={(e) => e.stopPropagation()}>
            {item.source ? (
              <a href={item.metadata?.url} target="_blank">
                {item.source !== "march" && renderIcon(item.source)}
              </a>
            ) : (
              <div></div>
            )}
          </span>
        </div>
      </div>
      <Separator className="last:hidden opacity-20 my-0" />
    </SortableItem>
  );

  return (
    <div className="w-full">
      <SortableContext items={allSortedItems.map(item => item._id)} strategy={verticalListSortingStrategy}>
        {sortedOverdueItems.map((item) => renderItem(item, true))}
        {sortedItems.map((item) => renderItem(item, false))}
      </SortableContext>
    </div>
  );
}
