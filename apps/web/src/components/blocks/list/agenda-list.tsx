"use client";

import { AgendaListItems } from "./agenda-list-items";
import { BlockProvider } from "@/contexts/block-context";
import { useState } from "react";

interface Props {
  header?: string;
  arrayType: "today";
}

export default function AgendaListBlock({ arrayType }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className={`w-full mx-auto ${isDragging ? "overflow-hidden" : ""}`}>
      <BlockProvider arrayType={arrayType}>
        <section className="pt-3 px-4">
          <div className="draggable-container">
            <AgendaListItems onDragStateChange={setIsDragging} />
          </div>
        </section>
      </BlockProvider>
    </div>
  );
}
