"use server";

import { apiClient } from "@/lib/api";
import { CreateEventResponse, Event, EventResponse } from "@/types/calendar";

export async function getEventsByDate(date: string) {
  try {
    const response = await apiClient.get<EventResponse>(
      `/calendar/events/${date}/`
    );

    if (!response) {
      console.error("No response from calendar API");
      return [];
    }

    // Make sure we return something even if events are undefined
    return response.events || [];
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    // Return empty array instead of throwing error to prevent blocking the app
    return [];
  }
}

export async function createEvent(event: Partial<Event>) {
  const response = await apiClient.post<CreateEventResponse, Partial<Event>>(
    "/calendar/events",
    event
  );
  return response.newEvent;
}

export async function updateEvent(eventId: string, event: Partial<Event>) {
  const response = await apiClient.patch<CreateEventResponse, Partial<Event>>(
    `/calendar/events/${eventId}/`,
    event
  );
  return response.newEvent;
}

export async function deleteEvent(eventId: string) {
  await apiClient.delete(`/calendar/events/${eventId}/`);
}
