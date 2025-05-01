"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@/components/editor/editor";
import { JSONContent } from "novel";
import { format, isToday as isDateToday } from "date-fns";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

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
  const formattedDate = useRef(format(currentDate, "EEEE, MMMM d, yyyy"));
  
  // Initialize state with null, will be populated in useEffect
  const [content, setContent] = useState<JSONContent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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

  // Update derived values when currentDate changes
  useEffect(() => {
    dateKey.current = format(currentDate, "yyyy-MM-dd");
    formattedDate.current = format(currentDate, "EEEE, MMMM d, yyyy");
    
    // Check if the current date is today
    setIsToday(isDateToday(currentDate));
    
    // Reset content and loading state
    setContent(null);
    setIsLoaded(false);
    
    // Load content for the new date
    loadContent();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);
  
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-medium text-gray-700">{formattedDate.current}</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={goToPreviousDay}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            aria-label="Previous day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <button 
            onClick={goToToday}
            disabled={isToday}
            className={`text-xs px-2 py-1 rounded ${isToday ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
            aria-label="Go to today"
          >
            Today
          </button>
          
          <button 
            onClick={goToNextDay}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
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
