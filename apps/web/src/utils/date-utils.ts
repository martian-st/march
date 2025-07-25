import { Objects } from "@/types/objects";
import { format, isBefore } from "date-fns";

/**
 * Gets the effective due date from the structured due object
 * @param object - The object to extract the due date from
 * @returns The effective due date as a Date object or null
 */
export const getEffectiveDueDate = (object: Objects): Date | null => {
  if (!object) return null;
  
  // Get date from the structured due object
  if (object.due && object.due.date) {
    return new Date(object.due.date);
  }
  
  return null;
};

/**
 * Checks if an object is overdue based on its due date
 * @param object - The object to check
 * @returns True if the object is overdue
 */
export const isOverdue = (object: Objects): boolean => {
  const dueDate = getEffectiveDueDate(object);
  if (!dueDate) return false;
  
  return isBefore(dueDate, new Date());
};

/**
 * Gets the recurrence pattern from the structured due object
 * @param object - The object to extract the recurrence from
 * @returns The recurrence pattern or null
 */
export const getRecurrencePattern = (object: Objects): string | null => {
  if (!object) return null;
  
  // Get recurrence from the structured due object
  if (object.due && object.due.is_recurring && object.due.string) {
    return object.due.string;
  }
  
  return null;
};

/**
 * Formats a due date for display
 * @param object - The object containing due date information
 * @param formatString - Optional format string for date-fns
 * @returns Formatted date string or empty string if no date
 */
export const formatDueDate = (object: Objects, formatString: string = "MMM d"): string => {
  const dueDate = getEffectiveDueDate(object);
  if (!dueDate) return "";
  
  return format(dueDate, formatString);
};

/**
 * Creates a structured due object from a date and recurrence pattern
 * @param date - The date to use
 * @param recurrence - Optional recurrence pattern (e.g., 'daily', 'weekly', 'monthly')
 * @returns Structured due object
 */
export const createStructuredDue = (
  date: Date | string | null,
  recurrence: string | null = null
): Objects["due"] => {
  if (!date) return null;
  
  // Convert to Date object if string
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // Only set is_recurring to true if a recurrence pattern is provided
  const isRecurring = recurrence !== null && recurrence !== "";
  
  // Get the timezone from the system
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  
  // Create a date that preserves the local date parts but in UTC time
  // This is the key fix - we create a UTC date with the same day/month/year as the local date
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();
  
  // Create a new UTC date with the same date parts
  // This ensures the date stored will have the same day value regardless of timezone
  const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  
  // Convert to ISO string (will be in UTC)
  const isoString = utcDate.toISOString();
  
  return {
    date: isoString,
    is_recurring: isRecurring,
    lang: "en",
    string: isRecurring ? recurrence!.toLowerCase() : null,
    timezone: timezone
  };
};
