"use client";

import InputBox from "@/components/input/input-box";
import { ListItems } from "./list-items";
import { BlockProvider } from "@/contexts/block-context";
import { useCreateObject } from "@/hooks/use-objects";
import { CreateObject } from "@/types/objects";
import { useState } from "react";

interface Props {
  header?: string;
  arrayType: "inbox" | "today";
  activeFilter?: string;
}

export default function ListBlock({ arrayType, activeFilter = "unplanned" }: Props) {
  const { mutate: createObject } = useCreateObject();
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = (data: CreateObject) => {
    createObject(data);
  };

  return (
    <div className={`w-full mx-auto ${isDragging ? "overflow-hidden" : ""}`}>
      <BlockProvider arrayType={arrayType} activeFilter={activeFilter}>
        <section className="space-y-3 px-4 pt-2">
          <InputBox
            className="w-full"
            onSubmit={handleSubmit}
            arrayType={arrayType}
          />
        </section>
        <section className="pt-3 px-4">
          <div className="draggable-container">
            <ListItems onDragStateChange={setIsDragging} />
          </div>
        </section>
      </BlockProvider>
    </div>
  );
}
