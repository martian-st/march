"use client";

import { createContext, useContext, ReactNode, useRef } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { CalendarEvent, Event } from "@/types/calendar";
import { arrayMove } from "@dnd-kit/sortable";
import { Objects, OrderObject, SortableObject } from "@/types/objects";
import { useInboxObjects, useOrderObject, useRecurringObjects, useTodayObjects, useUpdateObject, useUpcomingObjects } from "@/hooks/use-objects";
import { useEvents } from "@/hooks/use-events";
import moment from "moment";
import { useQueryClient } from "@tanstack/react-query";

interface BlockContextType {
  items: Objects[];
  overdueItems: Objects[];
  events: CalendarEvent[];
  handleDragEnd: (event: DragEndEvent) => void;
  handleInternalListSort: (event: DragEndEvent) => void;
  handleCalendarDrop: (draggedItem: SortableObject, dropDate?: Date) => void;
  handleDeleteEvent: (eventId: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const BlockContext = createContext<BlockContextType | undefined>(undefined);

interface BlockProviderProps {
  children: ReactNode;
  arrayType: "inbox" | "today";
  activeFilter?: string;
}

export function BlockProvider({ children, arrayType, activeFilter = "unplanned" }: BlockProviderProps) {
  // Based on the arrayType and activeFilter, use the appropriate hook
  const inboxQuery = arrayType === "inbox" && activeFilter !== "upcoming" && activeFilter !== "recurrences" ? useInboxObjects() : { data: [], isLoading: false, error: null };
  const todayQuery = arrayType === "today" ? useTodayObjects() : { data: undefined, isLoading: false, error: null };
  const upcomingQuery = activeFilter === "upcoming" ? useUpcomingObjects() : { data: [], isLoading: false, error: null };
  const recurringQuery = activeFilter === "recurrences" ? useRecurringObjects() : { data: [], isLoading: false, error: null };
  
  const { mutate: updateOrder } = useOrderObject();
  const queryClient = useQueryClient();

  // Extract items depending on array type
  let items: Objects[] = [];
  let overdueItems: Objects[] = [];
  let isLoading = false;
  let error: any = null;
  
  if (arrayType === "inbox") {
    if (activeFilter === "upcoming") {
      // For upcoming filter, use the upcoming objects
      items = Array.isArray(upcomingQuery.data) ? upcomingQuery.data : [];
      isLoading = upcomingQuery.isLoading;
      error = upcomingQuery.error;
    } else if (activeFilter === "recurrences") {
      // For recurrences filter, use the recurring objects
      items = Array.isArray(recurringQuery.data) ? recurringQuery.data : [];
      isLoading = recurringQuery.isLoading;
      error = recurringQuery.error;
    } else {
      // For inbox with other filters, we just get a plain array of objects
      items = Array.isArray(inboxQuery.data) ? inboxQuery.data : [];
      isLoading = inboxQuery.isLoading;
      error = inboxQuery.error;
    }
  } else {
    // For today, we get an object with todayObjects and overdueObjects
    const todayData = todayQuery.data as { todayObjects: Objects[], overdueObjects: Objects[] } | undefined;
    items = Array.isArray(todayData?.todayObjects) ? todayData.todayObjects : [];
    overdueItems = Array.isArray(todayData?.overdueObjects) ? todayData.overdueObjects : [];
    isLoading = todayQuery.isLoading;
    error = todayQuery.error;
  }
  


  const today = moment().format("YYYY-MM-DD");
  const { data: events = [], addEvent, delEvent } = useEvents(today);

  // Add a ref to track if calendar drop is being handled
  const isHandlingCalendarDrop = useRef(false);

  const handleInternalListSort = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Check if both items are list items and not dragging to calendar
    const isActiveListItem = active.data.current?.type === "list-item";
    const isOverListItem = over.data.current?.type === "list-item";
    const isCalendarDrop = over.id === "calendar-drop-area";

    // Skip if this is a calendar drop
    if (isCalendarDrop || isHandlingCalendarDrop.current) return;

    if (isActiveListItem && isOverListItem) {
      const activeId = active.id as string;
      const overId = over.id as string;

      const oldIndex = items.findIndex((item) => item._id === activeId);
      const newIndex = items.findIndex((item) => item._id === overId);

      if (oldIndex !== newIndex) {
        // Create a new array with the item moved to the new position
        const newItems = arrayMove(items, oldIndex, newIndex);

        const orderObject: OrderObject = {
          orderedItems: newItems.map((item, index) => ({
            id: item._id,
            order: index,
          })),
        };

        // Call the mutation to update the order in the backend
        updateOrder(orderObject);
      }
    }
  };

  const handleCalendarDrop = (draggedItem: SortableObject, dropDate?: Date) => {
    if (isHandlingCalendarDrop.current) return;
    if (!draggedItem || !dropDate) {
      console.error("Missing required data for calendar drop");
      return;
    }

    try {
      isHandlingCalendarDrop.current = true;

      const startDate = dropDate;
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const newEvent: Partial<Event> = {
        summary: draggedItem.text || "New Event",
        start: {
          dateTime: startDate.toISOString(),
        },
        end: {
          dateTime: endDate.toISOString(),
        },
      };

      // Create the calendar event
      addEvent(newEvent);

      // Immediately update the cache to reflect the change
      if (draggedItem.id && typeof draggedItem.id === "string") {
        const itemId = draggedItem.id;

        // Update the cache directly
        const queryKey =
          arrayType === "inbox" ? ["inbox-objects"] : ["today-objects"];
        queryClient.setQueryData(queryKey, (oldData: Objects[] = []) => {
          return oldData.map((item) =>
            item._id === itemId ? { ...item, isCompleted: true } : item
          );
        });

        // Also invalidate to ensure we get fresh data
        queryClient.invalidateQueries({ queryKey: ["inbox-objects"] });
        queryClient.invalidateQueries({ queryKey: ["today-objects"] });
      }
    } finally {
      // Reset the flag after a short delay to ensure all handlers have completed
      setTimeout(() => {
        isHandlingCalendarDrop.current = false;
      }, 100);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    if (!over) return;

    // Skip if we're handling a calendar drop
    if (isHandlingCalendarDrop.current) return;

    // Only handle internal list sorting
    handleInternalListSort(event);
  };

  const handleDeleteEvent = (eventId: string) => {
    delEvent(eventId);
  };

  return (
    <BlockContext.Provider
      value={{
        items,
        overdueItems,
        events,
        handleDragEnd,
        handleInternalListSort,
        handleCalendarDrop,
        handleDeleteEvent,
        isLoading,
        error: error as Error,
      }}
    >
      {children}
    </BlockContext.Provider>
  );
}

export const useBlock = () => {
  const context = useContext(BlockContext);
  if (context === undefined) {
    throw new Error("useBlock must be used within an BlockProvider");
  }
  return context;
};
