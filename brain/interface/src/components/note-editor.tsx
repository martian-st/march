"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export function NoteEditor() {
  const [content, setContent] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [content]);

  const handleSave = useCallback(async () => {
    if (!content.trim() || state === "saving") return;

    setState("saving");
    try {
      const res = await fetch("/api/notes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (res.ok) {
        setState("saved");
        setContent("");
        setTimeout(() => setState("idle"), 2000);
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  }, [content, state]);

  // Cmd+Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write something..."
        className="w-full min-h-[60vh] resize-none bg-transparent text-sm leading-relaxed text-gray-900 placeholder:text-gray-300 focus:outline-none"
        spellCheck={false}
      />

      {content.trim().length > 0 && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={handleSave}
            disabled={state === "saving"}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors disabled:cursor-not-allowed"
          >
            {state === "saving" ? "sending..." : state === "saved" ? "sent to self" : "send to self"}
          </button>
          <span className="text-xs text-gray-300 ml-3">⌘↵</span>
        </div>
      )}
    </div>
  );
}
