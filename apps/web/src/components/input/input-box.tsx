"use client";

import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";
import { CreateObject } from "@/types/objects";
import React, { useState } from "react";

interface InputBoxProps {
  className?: string;
  onSubmit: (data: CreateObject) => void;
  arrayType: "inbox" | "today";
}

export default function InputBox({
  className,
  onSubmit,
  arrayType,
}: InputBoxProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem("todo") as HTMLInputElement;

    if (!input.value.trim()) return;

    if (arrayType === "today") {
      const today = new Date().toISOString();
      onSubmit({ title: input.value.trim(), dueDate: today });
    } else {
      onSubmit({ title: input.value.trim() });
    }

    form.reset();
    setIsFocused(false);
  };

  const placeholderText = arrayType === "inbox" 
    ? "Add a new object..." 
    : "Add an object for today...";

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={cn(
        "flex items-center gap-2 pl-2 pr-3 py-1 rounded-md",
        "bg-white",
        "transition-colors"
      )}>
        <div className="flex items-center justify-center" style={{ width: '18px' }}>
          <Checkbox className="h-[18px] w-[18px] opacity-40" />
        </div>
        <Input
          name="todo"
          placeholder={placeholderText}
          className={cn(
            "border-none shadow-none p-0 h-auto",
            "focus-visible:ring-0 focus:outline-none",
            "bg-transparent text-sm placeholder:text-gray-400",
            className
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            // Only set to false if the form is not being submitted
            if (e.relatedTarget?.tagName !== 'BUTTON') {
              setIsFocused(false);
            }
          }}
        />
      </div>
    </form>
  );
}
