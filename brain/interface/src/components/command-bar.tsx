"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cmd+K to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
          return !prev;
        });
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setValue("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpen(false);
        setValue("");
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/objects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.ok) {
        setValue("");
        setOpen(false);
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }, [value, submitting, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/5" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
        <div
          ref={barRef}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm"
        >
          <span className="text-gray-300 text-sm select-none">+</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Insert a link, or just plain text..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none"
            disabled={submitting}
          />
          <kbd className="text-[10px] text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 select-none">
            esc
          </kbd>
        </div>
      </div>
    </div>
  );
}
