"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@/components/editor/editor";
import { JSONContent } from "novel";
import { format, isToday as isDateToday, parse } from "date-fns";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

interface DailyNotesProps {
  date?: Date;
}

interface JournalResponse {
  journal: {
    _id: string;
    date: string;
    content: string;
    user: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface JournalDatesResponse {
  dates: string[];
}

interface CalendarGridProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  datesWithEntries: string[];
}

// Calendar grid component to display days of the month
function CalendarGrid({ currentDate, onSelectDate, datesWithEntries }: CalendarGridProps) {
  // Get the first day of the month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  // Get the last day of the month
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Get the day of the week for the first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // Calculate the number of days in the previous month to display
  const daysFromPrevMonth = firstDayOfWeek;
  
  // Calculate the number of days in the current month
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Calculate the number of days from the next month to display
  const daysFromNextMonth = 42 - daysFromPrevMonth - daysInMonth;
  
  // Get the previous month's last days
  const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  
  // Generate the days array
  const days = [];
  
  // Add days from the previous month
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthLastDay - i);
    days.push({
      date,
      dayOfMonth: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: isDateToday(date)
    });
  }
  
  // Add days from the current month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    days.push({
      date,
      dayOfMonth: i,
      isCurrentMonth: true,
      isToday: isDateToday(date)
    });
  }
  
  // Add days from the next month
  for (let i = 1; i <= daysFromNextMonth; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
    days.push({
      date,
      dayOfMonth: i,
      isCurrentMonth: false,
      isToday: isDateToday(date)
    });
  }
  
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, index) => (
        <button
          key={index}
          onClick={() => onSelectDate(day.date)}
          className={`
            w-10 h-10 flex flex-col items-center justify-center text-sm relative
            ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
            ${day.isToday ? 'font-bold text-blue-600' : 'hover:bg-gray-100'}
            ${format(currentDate, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd') ? 'bg-blue-500 text-white rounded-full' : ''}
          `}
        >
          {day.dayOfMonth}
          {datesWithEntries.includes(format(day.date, 'yyyy-MM-dd')) && (
            <div className="absolute bottom-0.5 w-2 h-2 bg-blue-500 rounded-full"></div>
          )}
        </button>
      ))}
    </div>
  );
}

// Create empty content for new journal entries
const createEmptyContent = (): JSONContent => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: []
    }
  ]
});

export function DailyNotes({ date: initialDate = new Date() }: DailyNotesProps) {
  // Use state for the current date so we can navigate between dates
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [isToday, setIsToday] = useState<boolean>(isDateToday(initialDate));
  
  // Derive these values from the current date
  const dateKey = useRef(format(currentDate, "yyyy-MM-dd"));
  const formattedDate = useRef(format(currentDate, "EEEE, MMMM d"));
  
  // Initialize state with null, will be populated in useEffect
  const [content, setContent] = useState<JSONContent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Track dates with journal entries
  const [datesWithEntries, setDatesWithEntries] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Reference for the save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigate to the previous day
  const goToPreviousDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setCurrentDate(prevDay);
  };

  // Navigate to the next day
  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
  };

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Fetch dates with journal entries - memoized to prevent unnecessary re-renders
  const fetchDatesWithEntries = useCallback(async () => {
    try {
      // Get the current month and year for filtering
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Try to fetch from API first
      try {
        // Include query parameters in the URL since apiClient.get only accepts one parameter
        const response = await apiClient.get<JournalDatesResponse>(`/api/journals/dates?year=${year}&month=${month}`);
        
        if (response && response.dates && Array.isArray(response.dates)) {
          setDatesWithEntries(response.dates);
          return;
        }
      } catch (apiError) {
        console.log("API endpoint for journal dates not available, using localStorage");
      }
      
      // Fallback to checking localStorage - this is synchronous and fast
      const dates = [];
      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Check if it's a daily notes entry
        if (key && key.startsWith('daily-notes-')) {
          const dateStr = key.replace('daily-notes-', '');
          // Check if the date is valid and in the current month/year
          try {
            const entryDate = new Date(dateStr);
            if (
              entryDate.getFullYear() === year &&
              entryDate.getMonth() === month - 1
            ) {
              dates.push(dateStr);
            }
          } catch (e) {
            // Skip invalid dates
          }
        }
      }
      
      setDatesWithEntries(dates);
    } catch (error) {
      console.error('Error fetching dates with entries:', error);
      setDatesWithEntries([]);
    }
  }, [currentDate]); // Only recreate when currentDate changes

  // Load content from API or localStorage
  const loadContent = async () => {
    try {
      // Try to load from API first
      try {
        const response = await apiClient.get<JournalResponse>(`/api/journals/date/${dateKey.current}`);
        if (response.journal && response.journal.content) {
          // Convert plain text to JSON content
          const jsonContent = createContentFromText(response.journal.content);
          setContent(jsonContent);
          // Also save to localStorage as backup
          localStorage.setItem(`daily-notes-${dateKey.current}`, JSON.stringify(jsonContent));
          setIsLoaded(true);
          return;
        }
      } catch (apiError) {
        console.log("Could not load from API, falling back to localStorage");
      }
      
      // Fall back to localStorage if API fails
      const savedContent = localStorage.getItem(`daily-notes-${dateKey.current}`);
      if (savedContent) {
        setContent(JSON.parse(savedContent));
      } else {
        setContent(createEmptyContent());
      }
    } catch (e) {
      console.error("Error loading content:", e);
      setContent(createEmptyContent());
    } finally {
      setIsLoaded(true);
    }
  };

  // Convert plain text to JSONContent
  const createContentFromText = (text: string): JSONContent => {
    const paragraphs = text.split('\n').map(line => ({
      type: "paragraph",
      content: line.trim() ? [{ type: "text", text: line }] : []
    }));
    
    return {
      type: "doc",
      content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph", content: [] }]
    };
  };

  // Content change handler - memoize to avoid recreating on each render
  const handleContentChange = useCallback((newContent: string) => {
    try {
      // Save to localStorage as a backup
      localStorage.setItem(`daily-notes-${dateKey.current}`, newContent);
      
      // Save to API
      const saveToAPI = async () => {
        try {
          const contentObj = JSON.parse(newContent);
          let plainText = "";
          
          // Extract plain text from the JSON content
          if (contentObj.content) {
            plainText = contentObj.content
              .map((block: any) => {
                if (block.content) {
                  return block.content
                    .map((item: any) => item.text || "")
                    .join("");
                }
                return "";
              })
              .join("\n");
          }
          
          // Only save if there's actual content
          if (plainText.trim()) {
            await apiClient.post('/api/journals/create-update/', {
              date: dateKey.current,
              content: plainText
            });
          }
        } catch (err) {
          console.error("Error saving to API:", err);
        }
      };
      
      // Debounce the API call to avoid too many requests
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(saveToAPI, 1000);
    } catch (e) {
      console.error("Error saving content:", e);
    }
  }, []);

  // Track the previous date key to detect changes
  const prevDateKey = useRef<string>('');

  // Update derived values when currentDate changes
  useEffect(() => {
    const newDateKey = format(currentDate, "yyyy-MM-dd");
    dateKey.current = newDateKey;
    formattedDate.current = format(currentDate, "EEEE, MMMM d");
    
    // Check if the current date is today
    setIsToday(isDateToday(currentDate));
    
    // Only reset content and loading state if the date actually changed
    if (prevDateKey.current !== newDateKey) {
      setContent(null);
      setIsLoaded(false);
      loadContent();
      prevDateKey.current = newDateKey;
    }
  }, [currentDate]);
  
  // Handle calendar open/close
  useEffect(() => {
    if (isCalendarOpen) {
      // Only fetch dates when the calendar is opened
      fetchDatesWithEntries();
    }
  }, [isCalendarOpen, fetchDatesWithEntries]);
  
  // Initial setup and cleanup
  useEffect(() => {
    // Clean up timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Show loading state until content is loaded
  if (!isLoaded) {
    return <div className="p-4">Loading daily notes...</div>;
  }
  
  // Initialize content if it's null
  if (!content) {
    setContent(createEmptyContent());
    return <div className="p-4">Preparing editor...</div>;
  }

  return (
    <div className="daily-notes bg-white p-6 mb-6">
      <div className="flex justify-between items-center mb-6 -mt-2">
        <Popover.Root onOpenChange={(open) => {
            setIsCalendarOpen(open);
            if (open) {
              // Fetch dates with entries when calendar opens
              setTimeout(() => fetchDatesWithEntries(), 0);
            }
          }}>
          <Popover.Trigger asChild>
            <button 
              className="flex items-center gap-1 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors group"
              aria-label="Select date"
            >
              <span>{formattedDate.current}</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-gray-400 group-hover:text-gray-600 transition-colors"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content 
              className="bg-white p-4 rounded-md shadow-lg w-[300px] z-50" 
              sideOffset={5}
              align="start"
            >
              <div className="calendar-wrapper">
                <div className="flex justify-between items-center mb-4 px-1">
                  <div className="flex items-center gap-2">
                    {/* Month selector - styled as a dropdown button */}
                    <div className="relative inline-block">
                      <select
                        value={currentDate.getMonth()}
                        onChange={(e) => {
                          const newDate = new Date(currentDate);
                          newDate.setMonth(parseInt(e.target.value));
                          setCurrentDate(newDate);
                        }}
                        className="appearance-none bg-transparent border-none text-base font-medium text-gray-800 pr-8 py-1 cursor-pointer focus:outline-none"
                        aria-label="Select month"
                      >
                        {[
                          "January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"
                        ].map((month, index) => (
                          <option key={month} value={index}>{month}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Year selector - styled as a dropdown button */}
                    <div className="relative inline-block">
                      <select
                        value={currentDate.getFullYear()}
                        onChange={(e) => {
                          const newDate = new Date(currentDate);
                          newDate.setFullYear(parseInt(e.target.value));
                          setCurrentDate(newDate);
                        }}
                        className="appearance-none bg-transparent border-none text-base font-medium text-gray-800 pr-8 py-1 cursor-pointer focus:outline-none"
                        aria-label="Select year"
                      >
                        {Array.from({ length: 21 }, (_, i) => {
                          const year = new Date().getFullYear() - 10 + i;
                          return (
                            <option key={year} value={year}>{year}</option>
                          );
                        })}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        const prevMonth = new Date(currentDate);
                        prevMonth.setMonth(prevMonth.getMonth() - 1);
                        setCurrentDate(prevMonth);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100"
                      aria-label="Previous month"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>
                    <button 
                      onClick={() => {
                        const nextMonth = new Date(currentDate);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        setCurrentDate(nextMonth);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100"
                      aria-label="Next month"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="p-1">{day}</div>
                  ))}
                </div>
                
                <CalendarGrid 
                  currentDate={currentDate} 
                  datesWithEntries={datesWithEntries}
                  onSelectDate={(date) => {
                    setCurrentDate(date);
                    // Close the popover after selection
                    document.body.click();
                  }} 
                />
                
                <div className="flex justify-end mt-3">
                  <button 
                    onClick={() => {
                      setCurrentDate(new Date());
                      // Close the popover after selection
                      document.body.click();
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1"
                  >
                    Today
                  </button>
                </div>
              </div>
              <Popover.Arrow className="fill-white" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={goToPreviousDay}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50"
            aria-label="Previous day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <button 
            onClick={goToToday}
            disabled={isToday}
            className={`text-xs px-2 py-1 rounded ${isToday ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
            aria-label="Go to today"
          >
            Today
          </button>
          
          <button 
            onClick={goToNextDay}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50"
            aria-label="Next day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
      <div className="prose prose-sm w-full">
        <Editor 
          initialValue={content} 
          onChange={handleContentChange} 
        />
      </div>
    </div>
  );
}
