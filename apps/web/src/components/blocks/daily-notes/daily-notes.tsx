"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@/components/editor/editor";
import { JSONContent } from "novel";
import { format } from "date-fns";
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

// Create default content outside the component to avoid recreating it on each render
const createDefaultContent = (formattedDate: string): JSONContent => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Today was a simple day." }]
    },
    {
      type: "paragraph",
      content: []
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "text", text: "Add your first task here" }]
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "text", text: "Add another task" }]
        },
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "text", text: "This task is already completed" }]
        }
      ]
    },
    {
      type: "paragraph",
      content: []
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "It's nice to have a breather some time." }]
    }
  ]
});

export function DailyNotes({ date = new Date() }: DailyNotesProps) {
  // Use refs to avoid recreating these values on each render
  const dateKey = useRef(format(date, "yyyy-MM-dd"));
  const formattedDate = useRef(format(date, "EEEE, MMMM d, yyyy"));
  
  // Initialize state with null, will be populated in useEffect
  const [content, setContent] = useState<JSONContent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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

  // Reference for the save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load content from API or localStorage
  useEffect(() => {
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
          setContent(createDefaultContent(formattedDate.current));
        }
      } catch (e) {
        console.error("Error loading content:", e);
        setContent(createDefaultContent(formattedDate.current));
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadContent();
    
    // Clean up timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Show loading state until content is loaded
  if (!isLoaded || !content) {
    return <div className="p-4">Loading daily notes...</div>;
  }

  return (
    <div className="daily-notes bg-white p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-medium text-gray-700">{formattedDate.current}</h2>
        <div className="flex space-x-2">
          <button className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button className="text-gray-400 hover:text-gray-600">
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
