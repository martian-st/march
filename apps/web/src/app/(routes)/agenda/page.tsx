import { Block } from "@/components/blocks/block";
import GridWrapper from "@/components/wrappers/grid-wrapper";
import AgendaListBlock from "@/components/blocks/list/agenda-list";
import { DailyNotes } from "@/components/blocks/daily-notes/daily-notes";
import { CalendarBlock } from "@/components/blocks/calendar/calendar";
import { CalendarProvider } from "@/contexts/calendar-context";

export default function Agenda() {
  return (
    <section className="h-full pl-12">
      <div className="w-full h-[calc(100vh-64px)] flex flex-col pt-0">
        <div className="max-w-4xl w-full flex flex-col h-full">
          {/* Split view with two scrollable sections */}
          <div className="flex flex-col h-full">
            {/* Daily Notes Component - Scrollable section 1 */}
            <div className="flex-1 min-h-0 overflow-auto mb-4 border-b border-gray-100 pb-4">
              <DailyNotes />
            </div>
            
            {/* List Component - Scrollable section 2 */}
            <div className="flex-1 min-h-0 overflow-auto">
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
