"use client";

 

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Event } from "@/types/calendar";
import { toast } from "sonner";
import { createEvent, deleteEvent, getEventsByDate, updateEvent } from "@/actions/calendar";
import { transformGoogleEventToCalendarEvent } from "@/lib/utils";
import { useUser } from "./use-user";

const QUERY_KEYS = {
  EVENTS: (date: string) => ["events", date],
};

export function useEvents(date: string) {
  const queryClient = useQueryClient();

  const { data: userData } = useUser();
  const isCalendarConnected = userData?.integrations?.googleCalendar?.connected;

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.EVENTS(date),
    queryFn: async () => {
      if (!isCalendarConnected) {
        return [];
      }
      return getEventsByDate(date);
    },
    enabled: !!date,
    select: (data) => data.map(transformGoogleEventToCalendarEvent),
  });

  const { mutate: addEvent } = useMutation({
    mutationKey: ["create-event"],
    mutationFn: (event: Partial<Event>) => createEvent(event),
    onMutate: async (newEvent) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EVENTS(date) });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData(QUERY_KEYS.EVENTS(date));

      // Optimistically update to the new value
      queryClient.setQueryData(QUERY_KEYS.EVENTS(date), (old: Event[] = []) => {
        return [...old, newEvent];
      });

      // Return a context object with the snapshotted value
      return { previousEvents };
    },
    onError: (err, newEvent, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context) {
        queryClient.setQueryData(
          QUERY_KEYS.EVENTS(date),
          context.previousEvents,
        );
      }
      toast.error("Failed to create event");
      console.error("Failed to create event:", err);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS(date) });
    },
  });

  const { mutate: delEvent } = useMutation({
    mutationKey: ["delete-event"],
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onMutate: async (eventId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EVENTS(date) });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData(QUERY_KEYS.EVENTS(date));

      // Optimistically remove the event
      queryClient.setQueryData(QUERY_KEYS.EVENTS(date), (old: Event[] = []) => {
        return old.filter(event => event.id !== eventId);
      });

      // Return a context object with the snapshotted value
      return { previousEvents };
    },
    onError: (err, eventId, context) => {
      // If the mutation fails, roll back to the previous state
      if (context) {
        queryClient.setQueryData(
          QUERY_KEYS.EVENTS(date),
          context.previousEvents
        );
      }
      toast.error("Failed to delete event");
      console.error("Failed to delete event:", err);
    },
    onSuccess: () => {
      toast.success("Event deleted");
    },
  });

  const { mutate: mutateEvent } = useMutation({
    mutationKey: ["update-event"],
    mutationFn: (event: Partial<Event>) => updateEvent(event.id || "", event),
    onMutate: async (event) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EVENTS(date) });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData(QUERY_KEYS.EVENTS(date));

      // Optimistically update the event
      queryClient.setQueryData(QUERY_KEYS.EVENTS(date), (old: Event[] = []) => {
        return old.map(e => e.id === event.id ? event : e);
      });

      return { previousEvents };
    },
    onError: (err, event, context) => {
      // If the mutation fails, roll back to the previous state
      if (context) {
        queryClient.setQueryData(
          QUERY_KEYS.EVENTS(date),
          context.previousEvents
        );
      }
      toast.error("Failed to update event");
      console.error("Failed to update event:", err);
    },
    onSuccess: () => {
      toast.success("Event updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS(date) });
    },
  });

  return {
    data,
    isLoading,
    error,
    addEvent,
    delEvent,
    mutateEvent
  };
}

