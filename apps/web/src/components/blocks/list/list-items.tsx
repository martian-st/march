"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import React, { useState, useMemo } from "react";
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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { format, isToday as isDateToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface ListItemsProps {
  onDragStateChange?: (isDragging: boolean) => void;
}

export function ListItems({ onDragStateChange }: ListItemsProps) {
  const { items } = useBlock();
  const { mutate: updateObject } = useUpdateObject();
  const [expandedItem, setExpandedItem] = useState<Objects | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState<string | null>(null);

  // Generate days for the current month view
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Handle date selection
  const handleDateSelect = (date: Date, itemId: string) => {
    updateObject({
      _id: itemId,
      dueDate: date.toISOString()
    } as Partial<Objects>);
    setIsCalendarOpen(null);
  };

  // Navigate months
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => a.order - b.order);
  }, [items]);

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

  return (
    <div className="w-full">
      <SortableContext items={sortedItems.map(item => item._id)} strategy={verticalListSortingStrategy}>
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
            <div className="flex items-center justify-between w-full group py-1 pl-2 relative">
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
                <div className="flex items-center gap-2 flex-1">
                  <div 
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "text-sm cursor-pointer select-none",
                      item.isCompleted
                        ? "text-gray-400 line-through"
                        : "text-gray-700",
                    )}
                  >
                    {item.title}
                  </div>
                  
                  {/* Calendar popover */}
                  <Popover.Root 
                    open={isCalendarOpen === item._id}
                    onOpenChange={(open) => setIsCalendarOpen(open ? item._id : null)}
                  >
                    <Popover.Trigger asChild>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentMonth(item.dueDate ? new Date(item.dueDate) : new Date());
                        }}
                      >
                        <CalendarIcon className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content 
                        className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-[280px] z-50"
                        sideOffset={8}
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-full">
                          <div className="flex justify-between items-center mb-4 px-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                prevMonth();
                              }}
                              className="p-1 rounded-full hover:bg-gray-100"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            
                            <div className="text-sm font-medium">
                              {format(currentMonth, 'MMMM yyyy')}
                            </div>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                nextMonth();
                              }}
                              className="p-1 rounded-full hover:bg-gray-100"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                              <div key={i} className="h-6 flex items-center justify-center">
                                {day}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {daysInMonth.map((date: Date, index: number) => {
                              const isSelected = item.dueDate && isSameDay(date, new Date(item.dueDate));
                              const isToday = isDateToday(date);
                              
                              return (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDateSelect(date, item._id);
                                  }}
                                  className={`
                                    h-8 w-8 flex items-center justify-center text-sm rounded-full relative
                                    ${isToday ? 'font-medium text-blue-600' : 'text-gray-900'}
                                    ${
                                      isSelected
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'hover:bg-gray-100'
                                    }
                                  `}
                                >
                                  {format(date, 'd')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Source icon */}
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
            </div>
            <Separator className="last:hidden opacity-20 my-0" />
          </SortableItem>
        ))}
      </SortableContext>
    </div>
  );
}
