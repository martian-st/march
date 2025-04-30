import { Block } from "@/components/blocks/block";
import GridWrapper from "@/components/wrappers/grid-wrapper";
import AgendaListBlock from "@/components/blocks/list/agenda-list";
import { DailyNotes } from "@/components/blocks/daily-notes/daily-notes";
import { CalendarBlock } from "@/components/blocks/calendar/calendar";
import { CalendarProvider } from "@/contexts/calendar-context";

export default function Agenda() {
  return (
    <section className="h-full pl-12">
      <div className="w-full h-[calc(100vh-64px)] overflow-auto pt-0">
        <div className="max-w-4xl">
          {/* Daily Notes Component */}
          <DailyNotes />
          
          {/* List Component without input bar */}
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
    </section>
  );
}
