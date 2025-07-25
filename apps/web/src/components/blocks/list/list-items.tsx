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
import { useRecurringObjects, useUpdateObject, useUpcomingObjects } from "@/hooks/use-objects";
import ExpandedView from "@/components/object/expanded-view";
import { Icons } from "@/components/ui/icons";
import { Objects } from "@/types/objects";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Sun } from "lucide-react";
import { getEffectiveDueDate, createStructuredDue, formatDueDate, getRecurrencePattern } from "@/utils/date-utils";
import * as Popover from "@radix-ui/react-popover";
import { format, isToday as isDateToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore } from "date-fns";

interface ListItemsProps {
  onDragStateChange?: (isDragging: boolean) => void;
}

export function ListItems({ onDragStateChange }: ListItemsProps) {
  const { items } = useBlock();
  const { mutate: updateObject } = useUpdateObject();
  const [expandedItem, setExpandedItem] = useState<Objects | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState<string | null>(null);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isRepeatOpen, setIsRepeatOpen] = useState<string | null>(null);
  const [selectedRepeat, setSelectedRepeat] = useState<string | null>(null);

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
    let updatedDate = date;
    
    // If there's a selected time, add it to the date
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      updatedDate = new Date(date);
      updatedDate.setHours(hours, minutes);
    }
    
    // Create the structured due object
    const dueObject = createStructuredDue(
      updatedDate,
      selectedRepeat
    );
    
    updateObject({
      _id: itemId,
      due: dueObject
    } as Partial<Objects>);
    
    setIsCalendarOpen(null);
  };
  
  // Handle time selection
  const handleTimeSelect = (time: string, itemId: string) => {
    setSelectedTime(time);
    setIsTimePickerOpen(null);
    
    // If there's already a selected date, update the object with the new time
    const item = items.find(i => i._id === itemId);
    const dueDate = getEffectiveDueDate(item!);
    if (item && dueDate) {
      const date = new Date(dueDate);
      const [hours, minutes] = time.split(':').map(Number);
      date.setHours(hours, minutes);
      
      // Create the structured due object
      const dueObject = createStructuredDue(
        date,
        item.due?.string || null
      );
      
      updateObject({
        _id: itemId,
        due: dueObject
      } as Partial<Objects>);
    }
  };
  
  // Handle repeat selection
  const handleRepeatSelect = (repeat: string, itemId: string) => {
    setSelectedRepeat(repeat);
    setIsRepeatOpen(null);
    
    // Find the current item
    const currentItem = items.find(item => item._id === itemId);
    if (!currentItem) return;
    
    // Get the current due date if it exists, or create a new date
    const dueDate = getEffectiveDueDate(currentItem) || new Date();
    
    // Create a structured due object with the recurrence pattern
    // Preserve existing due object properties if they exist
    const existingDue = currentItem.due || {
      date: null,
      is_recurring: false,
      lang: "en",
      string: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    };
    
    const dueObject = {
      ...existingDue,
      date: dueDate.toISOString(),
      is_recurring: true,
      string: repeat.toLowerCase(),
      lang: existingDue.lang || "en",
      timezone: existingDue.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    };
    
    console.log('Updating with recurrence:', repeat, 'due object:', dueObject);
    
    // Update the object with the new due object
    updateObject({
      _id: itemId,
      due: dueObject
    } as Partial<Objects>);
  };

  // Navigate months
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => a.order - b.order);
  }, [items]);

  function renderIcon(source: string) {
    switch (source) {
      case "linear":
        return <Icons.linear className="h-3.5 w-3.5" />;
      case "github":
        return <Icons.gitHub className="h-3.5 w-3.5" />;
      case "gmail":
        return <Icons.gmail className="h-3.5 w-3.5" />;
      case "twitter":
        return <Icons.twitter className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  }

  // Component to display recurring tasks
  function RecurringTasksList({ currentItemId }: { currentItemId: string }) {
    const { data: recurringObjects, isLoading } = useRecurringObjects();
    
    // Group tasks by recurrence pattern
    const groupedTasks = useMemo(() => {
      const tasksByRecurrence = new Map<string, Objects[]>();
      
      if (!recurringObjects) return tasksByRecurrence;
      
      recurringObjects.forEach((task: Objects) => {
        // Get recurrence pattern from the structured due object
        const recurrencePattern = getRecurrencePattern(task) || 'Unknown';
        
        if (!tasksByRecurrence.has(recurrencePattern)) {
          tasksByRecurrence.set(recurrencePattern, []);
        }
        tasksByRecurrence.get(recurrencePattern)?.push(task);
      });
      
      return tasksByRecurrence;
    }, [recurringObjects, currentItemId]);
    
    if (isLoading) {
      return <div className="text-xs text-gray-400 py-2">Loading recurring tasks...</div>;
    }
    
    if (groupedTasks.size === 0) {
      return <div className="text-xs text-gray-400 py-2">No recurring tasks</div>;
    }
    
    return (
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {Array.from(groupedTasks.entries()).map(([recurrence, tasks]) => {
          return (
            <div key={recurrence} className="mb-2">
              <div className="text-xs font-medium text-gray-500 mb-1">{recurrence}</div>
              <div className="space-y-1">
                {tasks.map(task => (
                  <button
                    key={task._id}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-full text-left text-xs p-1.5 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Component to display upcoming tasks
  function UpcomingTasksList({ currentItemId, onSelectDate }: { currentItemId: string; onSelectDate: (date: Date, itemId: string) => void }) {
    const { data: upcomingObjects, isLoading } = useUpcomingObjects();
    
    // Filter out the current item and group by date
    const groupedTasks = useMemo(() => {
      if (!upcomingObjects) return new Map();
      
      const tasksByDate = new Map<string, Objects[]>();
      
      upcomingObjects
        .filter(task => {
          const dueDate = getEffectiveDueDate(task);
          return task._id !== currentItemId && dueDate !== null;
        }) // Exclude current item and tasks without due date
        .forEach(task => {
          const dueDate = getEffectiveDueDate(task);
          if (!dueDate) return;
          
          const dateKey = format(dueDate, 'yyyy-MM-dd');
          if (!tasksByDate.has(dateKey)) {
            tasksByDate.set(dateKey, []);
          }
          tasksByDate.get(dateKey)!.push(task);
        });
      
      return tasksByDate;
    }, [upcomingObjects, currentItemId]);
    
    if (isLoading) {
      return <div className="text-xs text-gray-400 py-2">Loading upcoming tasks...</div>;
    }
    
    if (groupedTasks.size === 0) {
      return <div className="text-xs text-gray-400 py-2">No upcoming tasks</div>;
    }
    
    return (
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {Array.from(groupedTasks.entries()).map(([dateStr, tasks]: [string, Objects[]]) => {
          const date = new Date(dateStr);
          const isToday = isDateToday(date);
          const isTomorrow = isDateToday(new Date(date.getTime() - 86400000)); // 24 hours in milliseconds
          
          return (
            <div key={dateStr} className="mb-2">
              <div className="text-xs font-medium text-gray-500 mb-1">
                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(date, 'EEEE, MMM d')}
              </div>
              <div className="space-y-1">
                {tasks.map(task => (
                  <button
                    key={task._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(date, currentItemId);
                    }}
                    className="w-full text-left text-xs p-1.5 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
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
                    onOpenChange={(open) => {
                      if (open) {
                        // When opening the calendar, set the current item ID and reset selected repeat
                        setIsCalendarOpen(item._id);
                        
                        // Reset the selected repeat option to match the current item's recurrence
                        const recurrencePattern = getRecurrencePattern(item);
                        setSelectedRepeat(recurrencePattern ? recurrencePattern.charAt(0).toUpperCase() + recurrencePattern.slice(1) : null);
                      } else {
                        setIsCalendarOpen(null);
                      }
                    }}
                  >
                    <Popover.Trigger asChild>
                      {item.due?.date ? (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentMonth(new Date(item.due?.date || new Date()));
                          }}
                        >
                          {/* Show date with appropriate color based on due status - recurring tasks always blue */}
                          <span className={cn(
                            "text-xs font-medium",
                            getEffectiveDueDate(item) && isBefore(getEffectiveDueDate(item)!, new Date()) && !item.due?.is_recurring ? "text-red-500" : "text-blue-500"
                          )}>
                            {formatDueDate(item)}
                            {item.due?.is_recurring && (
                              <span className="ml-1 text-gray-500">
                                <svg className="inline-block h-3 w-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                          </span>
                        </button>
                      ) : (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentMonth(new Date());
                          }}
                        >
                          <CalendarIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
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
                              className="flex items-center justify-between text-sm px-3 py-2 rounded hover:bg-gray-50 transition-colors w-full"
                            >
                              <div className="flex items-center gap-2">
                                <div className="relative flex items-center justify-center w-5 h-5">
                                  <div className="absolute inset-0 border border-gray-300 rounded-sm flex flex-col items-center justify-start pt-0.5">
                                    <div className="w-full h-0.5 bg-gray-200 mb-0.5"></div>
                                    <span className="text-[11px] font-medium text-gray-700 leading-none">
                                      {new Date().getDate()}
                                    </span>
                                  </div>
                                </div>
                                <span className="">Today</span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {format(new Date(), 'EEE')}
                              </span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                handleDateSelect(tomorrow, item._id);
                              }}
                              className="flex items-center justify-between text-sm px-3 py-2 rounded hover:bg-gray-50 transition-colors w-full"
                            >
                              <div className="flex items-center gap-2">
                                {/* <div className="flex items-center justify-center w-6 h-6  bg-gray-100 "> */}
                                <Sun className="h-3.5 w-3.5" />
                                {/* </div> */}
                                <span className="">Tomorrow</span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {format(new Date(new Date().setDate(new Date().getDate() + 1)), 'EEE')}
                              </span>
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
                              
                              const dueDate = getEffectiveDueDate(item);
                              const isSelected = dueDate && isSameDay(date, dueDate);
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
                          

                          {/* Repeat option */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <Popover.Root 
                              open={isRepeatOpen === item._id} 
                              onOpenChange={(open) => {
                                if (open) {
                                  // When opening the repeat selector, set the current item ID
                                  setIsRepeatOpen(item._id);
                                  
                                  // Set the selected repeat option to match the current item's recurrence
                                  const recurrencePattern = getRecurrencePattern(item);
                                  setSelectedRepeat(recurrencePattern ? recurrencePattern.charAt(0).toUpperCase() + recurrencePattern.slice(1) : null);
                                } else {
                                  setIsRepeatOpen(null);
                                }
                              }}
                            >
                              <Popover.Trigger asChild>
                                <button 
                                  className="flex items-center text-xs text-gray-600 hover:bg-gray-50 p-1 rounded-md w-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  <span>{selectedRepeat || 'Repeat'}</span>
                                </button>
                              </Popover.Trigger>
                              <Popover.Portal>
                                <Popover.Content 
                                  className="bg-white rounded-md shadow-lg border border-gray-200 w-64 p-2 z-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex flex-col space-y-1">
                                    {['Daily', 'Weekly', 'Monthly', 'Yearly', 'Every Weekday', 'Custom'].map((option) => (
                                      <button
                                        key={option}
                                        className={`text-left px-3 py-3 text-sm rounded-md hover:bg-gray-50 ${selectedRepeat === option ? 'bg-gray-50' : ''}`}
                                        onClick={() => handleRepeatSelect(option, item._id)}
                                      >
                                        {option}
                                        {option === 'Weekly' && <span className="text-gray-400 ml-2">(Wednesday)</span>}
                                        {option === 'Monthly' && <span className="text-gray-400 ml-2">(9th)</span>}
                                        {option === 'Yearly' && <span className="text-gray-400 ml-2">(Jul 9th)</span>}
                                        {option === 'Every Weekday' && <span className="text-gray-400 ml-2">(Mon - Fri)</span>}
                                      </button>
                                    ))}
                                  </div>
                                </Popover.Content>
                              </Popover.Portal>
                            </Popover.Root>
                          </div>
                          
                          {/* Time picker */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <Popover.Root open={isTimePickerOpen === item._id} onOpenChange={(open) => setIsTimePickerOpen(open ? item._id : null)}>
                              <Popover.Trigger asChild>
                                <button 
                                  className="flex items-center text-xs text-gray-600 hover:bg-gray-50 p-1 rounded-md w-full"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Clock className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                  <span>{selectedTime ? `${selectedTime}` : ' Time'}</span>
                                </button>
                              </Popover.Trigger>
                              <Popover.Portal>
                                <Popover.Content 
                                  className="bg-white rounded-md shadow-lg border border-gray-200 w-64 max-h-60 overflow-y-auto z-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex flex-col">
                                    {Array.from({ length: 48 }).map((_, i) => {
                                      const hour = Math.floor(i / 2);
                                      const minute = i % 2 === 0 ? '00' : '30';
                                      const period = hour < 12 ? 'AM' : 'PM';
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                      const timeString = `${displayHour.toString().padStart(2, '0')}:${minute} ${period}`;
                                      const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
                                      
                                      return (
                                        <button
                                          key={i}
                                          className={`text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedTime === timeValue ? 'bg-gray-50' : ''}`}
                                          onClick={() => handleTimeSelect(timeValue, item._id)}
                                        >
                                          {timeString}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </Popover.Content>
                              </Popover.Portal>
                            </Popover.Root>
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
