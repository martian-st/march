"use client";

import { Block } from "@/components/blocks/block";
import GridWrapper from "@/components/wrappers/grid-wrapper";
import AgendaListBlock from "@/components/blocks/list/agenda-list";
import { DailyNotes } from "@/components/blocks/daily-notes/daily-notes";
import { CalendarBlock } from "@/components/blocks/calendar/calendar";
import { CalendarProvider } from "@/contexts/calendar-context";

import { useEffect, useState, useRef } from "react";

export default function Agenda() {
  const [hasJournalContent, setHasJournalContent] = useState(false);
  const journalRef = useRef<HTMLDivElement>(null);
  
  // Check if journal has content after it renders
  useEffect(() => {
    const checkJournalContent = () => {
      if (journalRef.current) {
        const journalElement = journalRef.current.querySelector('.daily-notes');
        if (journalElement) {
          // Get text content excluding the date header
          const dateHeader = journalElement.querySelector('.flex.justify-between.items-center');
          const dateHeaderText = dateHeader ? dateHeader.textContent || '' : '';
          const fullText = journalElement.textContent || '';
          const contentText = fullText.replace(dateHeaderText, '').trim();
          
          // Check if there's meaningful content (not just placeholder text)
          const isEmpty = !contentText || 
                        contentText === 'Start writing...' || 
                        contentText.length < 3;
                        
          setHasJournalContent(!isEmpty);
        }
      }
    };
    
    // Initial check after a short delay to ensure content is loaded
    setTimeout(checkJournalContent, 100);
    
    // Set up a mutation observer to detect content changes
    const observer = new MutationObserver(() => {
      setTimeout(checkJournalContent, 50);
    });
    
    if (journalRef.current) {
      observer.observe(journalRef.current, { childList: true, subtree: true, characterData: true });
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <section className="h-full pl-12">
      <div className="w-full h-[calc(100vh-64px)] flex flex-col pt-0">
        <div className="max-w-4xl w-full flex flex-col h-full">
          {/* Split view with two scrollable sections */}
          <div className="flex flex-col h-full">
            {/* Daily Notes Component - Scrollable section 1 */}
            <div 
              ref={journalRef}
              className={`flex-1 min-h-0 mb-4 ${hasJournalContent ? 'overflow-auto custom-scrollbar' : 'overflow-hidden'}`}
            >
              <DailyNotes />
            </div>
            
            {/* List Component - Scrollable section 2 */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <Block id="list-and-calendar" arrayType="today">
                <GridWrapper>
                  <AgendaListBlock arrayType="today" />
                  {/* Calendar view commented out as requested */}
                  {/* <CalendarProvider>
                    <CalendarBlock />
                  </CalendarProvider> */}
                </GridWrapper>
              </Block>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
