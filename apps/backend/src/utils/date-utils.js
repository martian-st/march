/**
 * Utility functions for handling date formats and conversions
 */

/**
 * Converts a date to the new structured due format
 * @param {Date|null} dueDate - The original dueDate value
 * @param {String|null} recurrence - The recurrence pattern
 * @returns {Object} - The structured due object
 */
const convertToStructuredDue = (dueDate, recurrence = null) => {
  if (!dueDate) {
    return null;
  }

  const date = new Date(dueDate);
  
  return {
    date: date.toISOString(),
    is_recurring: recurrence !== null,
    lang: "en",
    string: recurrence ? recurrence.toLowerCase() : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  };
};

/**
 * Gets the effective due date from either the legacy dueDate field or the new structured due object
 * @param {Object} object - The object to extract the due date from
 * @returns {Date|null} - The effective due date as a Date object or null
 */
const getEffectiveDueDate = (object) => {
  if (!object) return null;
  
  // If we have the new structured format, use it
  if (object.due && object.due.date) {
    return new Date(object.due.date);
  }
  
  // Fall back to legacy dueDate
  if (object.dueDate) {
    return new Date(object.dueDate);
  }
  
  return null;
};

/**
 * Checks if an object is overdue based on its due date
 * @param {Object} object - The object to check
 * @returns {Boolean} - True if the object is overdue
 */
const isOverdue = (object) => {
  const dueDate = getEffectiveDueDate(object);
  if (!dueDate) return false;
  
  return dueDate < new Date();
};

/**
 * Gets the recurrence pattern from either the legacy recurrence field or the new structured due object
 * @param {Object} object - The object to extract the recurrence from
 * @returns {String|null} - The recurrence pattern or null
 */
const getRecurrencePattern = (object) => {
  if (!object) return null;
  
  // If we have the new structured format and it's recurring, use it
  if (object.due && object.due.is_recurring && object.due.string) {
    return object.due.string;
  }
  
  // Fall back to legacy recurrence
  return object.recurrence;
};

module.exports = {
  convertToStructuredDue,
  getEffectiveDueDate,
  isOverdue,
  getRecurrencePattern
};
