"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@/components/editor/editor";
import { JSONContent } from "novel";
import { format } from "date-fns";

interface DailyNotesProps {
  date?: Date;
}

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
      type: "paragraph",
      content: [{ type: "text", text: "I woke up, ate, took a nap, ate, and slept." }]
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
      localStorage.setItem(`daily-notes-${dateKey.current}`, newContent);
    } catch (e) {
      console.error("Error saving content:", e);
    }
  }, []);

  // Load content only once on component mount
  useEffect(() => {
    const loadContent = () => {
      try {
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
