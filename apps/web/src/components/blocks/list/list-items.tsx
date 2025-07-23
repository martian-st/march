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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
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

  // Generate days for the current month view with proper grid alignment
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDay = start.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    // Add empty cells for days before the 1st of the month
    const days = Array(startDay).fill(null);
    
    // Add all days of the month
    const monthDays = eachDayOfInterval({ start, end });
    days.push(...monthDays);
    
    return days;
  }, [currentMonth]);

  // Handle date selection
  const handleDateSelect = (date: Date, itemId: string) => {
    updateObject({
      _id: itemId,
      dueDate: date
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentMonth(item.dueDate ? new Date(item.dueDate) : new Date());
                        }}
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content 
                        className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-[252px] z-50"
                        sideOffset={4}
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-full">
                          {/* Quick action buttons */}
                          <div className="flex flex-col gap-1.5 mb-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const today = new Date();
                                handleDateSelect(today, item._id);
                              }}
                              className="flex items-center gap-2 text-sm px-2.5 py-1.5 text-left rounded hover:bg-gray-50 transition-colors w-full"
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600">
                                <CalendarIcon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">Today</div>
                                <div className="text-xs text-gray-500">{format(new Date(), 'EEE, MMM d')}</div>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                handleDateSelect(tomorrow, item._id);
                              }}
                              className="flex items-center gap-2 text-sm px-2.5 py-1.5 text-left rounded hover:bg-gray-50 transition-colors w-full"
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600">
                                <CalendarIcon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">Tomorrow</div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(new Date().setDate(new Date().getDate() + 1)), 'EEE, MMM d')}
                                </div>
                              </div>
                            </button>
                          </div>
                          
                          {/* Header with month and navigation */}
                          <div className="flex items-center justify-between mb-4">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                prevMonth();
                              }}
                              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            
                            <div className="text-sm font-medium text-gray-800">
                              {format(currentMonth, 'MMMM yyyy')}
                            </div>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                nextMonth();
                              }}
                              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Day headers */}
                          <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-gray-500 mb-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                              <div key={i} className="h-6 w-6 flex items-center justify-center mx-auto text-xs font-normal">
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 gap-0.5">
                            {daysInMonth.map((date, index) => {
                              if (!date) {
                                return <div key={`empty-${index}`} className="h-7 w-7" />;
                              }
                              
                              const isSelected = item.dueDate && isSameDay(date, new Date(item.dueDate));
                              const isToday = isDateToday(date);
                              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                              
                              return (
                                <div key={index} className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDateSelect(date, item._id);
                                    }}
                                    className={`
                                      h-7 w-7 flex items-center justify-center text-[13px] rounded mx-auto
                                      transition-colors duration-150
                                      ${!isCurrentMonth ? 'text-gray-300' : ''}
                                      ${isToday ? 'font-medium text-blue-500' : 'text-gray-700'}
                                      ${
                                        isSelected
                                          ? 'bg-blue-500 text-white'
                                          : 'hover:bg-gray-100'
                                      }
                                    `}
                                  >
                                    {format(date, 'd')}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Time picker */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center text-xs text-gray-600">
                              <Clock className="h-3.5 w-3.5 mr-2 text-gray-400" />
                              <span>No time</span>
                            </div>
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
