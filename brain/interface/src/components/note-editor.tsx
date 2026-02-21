"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";

interface Block {
  id: string;
  type: "text" | "h1" | "h2" | "h3" | "todo" | "bullet" | "numbered" | "divider" | "quote";
  content: string;
  checked?: boolean;
}

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

function newBlock(type: Block["type"] = "text", content = ""): Block {
  return { id: newId(), type, content, checked: type === "todo" ? false : undefined };
}

// Detect markdown shortcut at start of line
function detectShortcut(text: string): { type: Block["type"]; remaining: string } | null {
  const patterns: [RegExp, Block["type"]][] = [
    [/^# $/, "h1"],
    [/^## $/, "h2"],
    [/^### $/, "h3"],
    [/^\[\] $/, "todo"],
    [/^- \[\] $/, "todo"],
    [/^- $/, "bullet"],
    [/^\* $/, "bullet"],
    [/^1\. $/, "numbered"],
    [/^> $/, "quote"],
    [/^---$/, "divider"],
  ];

  for (const [pattern, type] of patterns) {
    if (pattern.test(text)) {
      return { type, remaining: "" };
    }
  }
  return null;
}

function BlockLine({
  block,
  autoFocus,
  onUpdate,
  onKeyDown,
  onToggleCheck,
  registerRef,
}: {
  block: Block;
  autoFocus: boolean;
  onUpdate: (id: string, content: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>, id: string) => void;
  onToggleCheck: (id: string) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
}) {
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onUpdate(block.id, e.currentTarget.textContent || "");
  };

  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      registerRef(block.id, el);
      if (el && autoFocus) {
        requestAnimationFrame(() => {
          el.focus();
          // Place cursor at end
          const range = document.createRange();
          const sel = window.getSelection();
          if (el.childNodes.length > 0) {
            range.setStartAfter(el.lastChild!);
          } else {
            range.setStart(el, 0);
          }
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        });
      }
    },
    [autoFocus, block.id, registerRef]
  );

  if (block.type === "divider") {
    return <hr className="my-4 border-gray-100" />;
  }

  const typeStyles: Record<string, string> = {
    text: "text-sm",
    h1: "text-2xl font-semibold",
    h2: "text-xl font-medium",
    h3: "text-base font-medium",
    todo: "text-sm",
    bullet: "text-sm",
    numbered: "text-sm",
    quote: "text-sm italic text-gray-500 border-l-2 border-gray-200 pl-3",
  };

  const placeholder: Record<string, string> = {
    text: "Type something, or use # [] - > ---",
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    todo: "To-do",
    bullet: "List item",
    numbered: "List item",
    quote: "Quote",
  };

  return (
    <div className="flex items-start gap-2 group">
      {block.type === "todo" && (
        <button
          onClick={() => onToggleCheck(block.id)}
          className="mt-[3px] flex-shrink-0 w-4 h-4 rounded border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
        >
          {block.checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      {block.type === "bullet" && (
        <span className="mt-[7px] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400" />
      )}

      {block.type === "numbered" && (
        <span className="mt-[2px] flex-shrink-0 text-sm text-gray-400 w-4 text-right">
          {/* Number will be calculated by parent if needed */}
        </span>
      )}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={(e) => onKeyDown(e, block.id)}
        data-placeholder={placeholder[block.type]}
        className={`
          flex-1 outline-none leading-relaxed text-gray-900
          ${typeStyles[block.type]}
          ${block.checked ? "line-through text-gray-400" : ""}
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300
        `}
      >
        {block.content}
      </div>
    </div>
  );
}

export function NoteEditor() {
  const [blocks, setBlocks] = useState<Block[]>([newBlock()]);
  const [focusId, setFocusId] = useState<string | null>(blocks[0].id);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const refs = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      refs.current.set(id, el);
    } else {
      refs.current.delete(id);
    }
  }, []);

  const focusBlock = useCallback((id: string, atEnd = true) => {
    setFocusId(id);
    requestAnimationFrame(() => {
      const el = refs.current.get(id);
      if (!el) return;
      el.focus();
      if (atEnd) {
        const range = document.createRange();
        const sel = window.getSelection();
        if (el.childNodes.length > 0) {
          range.setStartAfter(el.lastChild!);
        } else {
          range.setStart(el, 0);
        }
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }, []);

  const handleUpdate = useCallback((id: string, content: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const block = prev[idx];

      // Only detect shortcuts on text blocks
      if (block.type === "text") {
        const shortcut = detectShortcut(content);
        if (shortcut) {
          const updated = [...prev];
          if (shortcut.type === "divider") {
            updated[idx] = { ...block, type: "divider", content: "" };
            // Add a new text block after divider
            const nb = newBlock();
            updated.splice(idx + 1, 0, nb);
            requestAnimationFrame(() => focusBlock(nb.id));
          } else {
            updated[idx] = {
              ...block,
              type: shortcut.type,
              content: shortcut.remaining,
              checked: shortcut.type === "todo" ? false : undefined,
            };
          }
          return updated;
        }
      }

      const updated = [...prev];
      updated[idx] = { ...block, content };
      return updated;
    });
  }, [focusBlock]);

  const handleToggleCheck = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b))
    );
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, id: string) => {
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const block = blocks[idx];

      // Enter — split or create new block
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        const sel = window.getSelection();
        const el = refs.current.get(id);
        if (!el || !sel) return;

        // Get cursor position
        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.setStart(el, 0);
        preRange.setEnd(range.startContainer, range.startOffset);
        const before = preRange.toString();
        const after = (el.textContent || "").slice(before.length);

        // If block is empty and is a list/todo, convert back to text
        if (!block.content.trim() && block.type !== "text") {
          setBlocks((prev) => {
            const updated = [...prev];
            updated[idx] = { ...block, type: "text", content: "", checked: undefined };
            return updated;
          });
          return;
        }

        // Create new block, carry over type for lists
        const carryTypes: Block["type"][] = ["todo", "bullet", "numbered"];
        const newType = carryTypes.includes(block.type) ? block.type : "text";
        const nb = newBlock(newType, after);

        setBlocks((prev) => {
          const updated = [...prev];
          updated[idx] = { ...block, content: before };
          updated.splice(idx + 1, 0, nb);
          return updated;
        });

        // Update the current block's DOM to show only "before"
        if (el) el.textContent = before;

        requestAnimationFrame(() => focusBlock(nb.id, false));
      }

      // Backspace at start — merge with previous or convert to text
      if (e.key === "Backspace") {
        const sel = window.getSelection();
        const el = refs.current.get(id);
        if (!sel || !el) return;

        const range = sel.getRangeAt(0);
        const atStart = range.startOffset === 0 && range.collapsed;

        if (atStart) {
          e.preventDefault();

          // If block has a special type, convert to text first
          if (block.type !== "text") {
            setBlocks((prev) => {
              const updated = [...prev];
              updated[idx] = { ...block, type: "text", checked: undefined };
              return updated;
            });
            return;
          }

          // Merge with previous block
          if (idx > 0) {
            const prevBlock = blocks[idx - 1];
            if (prevBlock.type === "divider") {
              // Remove the divider
              setBlocks((prev) => prev.filter((_, i) => i !== idx - 1));
              return;
            }
            const mergedContent = prevBlock.content + block.content;
            const cursorPos = prevBlock.content.length;

            setBlocks((prev) => {
              const updated = [...prev];
              updated[idx - 1] = { ...prevBlock, content: mergedContent };
              return updated.filter((_, i) => i !== idx);
            });

            // Focus previous block at merge point
            requestAnimationFrame(() => {
              const prevEl = refs.current.get(prevBlock.id);
              if (!prevEl) return;
              prevEl.textContent = mergedContent;
              prevEl.focus();
              const r = document.createRange();
              const s = window.getSelection();
              // Set cursor at the merge point
              const textNode = prevEl.firstChild;
              if (textNode) {
                r.setStart(textNode, cursorPos);
                r.collapse(true);
                s?.removeAllRanges();
                s?.addRange(r);
              }
            });
          }
        }
      }

      // Arrow up at start — focus previous block
      if (e.key === "ArrowUp") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (range.startOffset === 0 && range.collapsed && idx > 0) {
            e.preventDefault();
            focusBlock(blocks[idx - 1].id);
          }
        }
      }

      // Arrow down at end — focus next block
      if (e.key === "ArrowDown") {
        const sel = window.getSelection();
        const el = refs.current.get(id);
        if (sel && el && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const atEnd = range.startOffset === (el.textContent || "").length && range.collapsed;
          if (atEnd && idx < blocks.length - 1) {
            e.preventDefault();
            focusBlock(blocks[idx + 1].id, false);
          }
        }
      }
    },
    [blocks, focusBlock]
  );

  // Serialize blocks to text for sending
  const serialize = useCallback(() => {
    return blocks
      .map((b) => {
        switch (b.type) {
          case "h1": return `# ${b.content}`;
          case "h2": return `## ${b.content}`;
          case "h3": return `### ${b.content}`;
          case "todo": return `- [${b.checked ? "x" : " "}] ${b.content}`;
          case "bullet": return `- ${b.content}`;
          case "numbered": return `1. ${b.content}`;
          case "quote": return `> ${b.content}`;
          case "divider": return "---";
          default: return b.content;
        }
      })
      .join("\n");
  }, [blocks]);

  const hasContent = blocks.some((b) => b.content.trim().length > 0);

  const handleSave = useCallback(async () => {
    if (!hasContent || state === "saving") return;
    const content = serialize();

    setState("saving");
    try {
      const res = await fetch("/api/notes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setState("saved");
        setBlocks([newBlock()]);
        setTimeout(() => setState("idle"), 2000);
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  }, [hasContent, serialize, state]);

  // Cmd+Enter to save
  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleSave]);

  // Number the numbered list items
  let numberedCounter = 0;

  return (
    <div className="min-h-[60vh]">
      <div className="space-y-1">
        {blocks.map((block, i) => {
          if (block.type === "numbered") {
            // Count consecutive numbered items
            if (i === 0 || blocks[i - 1].type !== "numbered") {
              numberedCounter = 1;
            } else {
              numberedCounter++;
            }
          }

          return (
            <div key={block.id} className="relative">
              {block.type === "numbered" && (
                <span className="absolute left-0 top-[2px] text-sm text-gray-400">
                  {numberedCounter}.
                </span>
              )}
              <div className={block.type === "numbered" ? "pl-6" : ""}>
                <BlockLine
                  block={block}
                  autoFocus={block.id === focusId}
                  onUpdate={handleUpdate}
                  onKeyDown={handleKeyDown}
                  onToggleCheck={handleToggleCheck}
                  registerRef={registerRef}
                />
              </div>
            </div>
          );
        })}
      </div>

      {hasContent && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={handleSave}
            disabled={state === "saving"}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors disabled:cursor-not-allowed"
          >
            {state === "saving" ? "sending..." : state === "saved" ? "sent" : "send to self"}
          </button>
          <span className="text-xs text-gray-300 ml-3">⌘↵</span>
        </div>
      )}
    </div>
  );
}
