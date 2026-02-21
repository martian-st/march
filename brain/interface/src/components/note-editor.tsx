"use client";

import { useEditor, EditorContent, Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

// --- Slash Command Extension ---

interface SlashItem {
  title: string;
  description: string;
  command: (editor: Editor) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Text",
    description: "Plain text block",
    command: (editor) =>
      editor.chain().focus().clearNodes().run(),
  },
  {
    title: "Heading 1",
    description: "Large heading",
    command: (editor) =>
      editor.chain().focus().clearNodes().setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium heading",
    command: (editor) =>
      editor.chain().focus().clearNodes().setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small heading",
    command: (editor) =>
      editor.chain().focus().clearNodes().setHeading({ level: 3 }).run(),
  },
  {
    title: "To-do list",
    description: "Track tasks with a checklist",
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleTaskList().run(),
  },
  {
    title: "Bullet list",
    description: "Unordered list",
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "Ordered list",
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleOrderedList().run(),
  },
  {
    title: "Quote",
    description: "Block quote",
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleBlockquote().run(),
  },
  {
    title: "Code",
    description: "Code block",
    command: (editor) =>
      editor.chain().focus().clearNodes().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    command: (editor) =>
      editor.chain().focus().setHorizontalRule().run(),
  },
];

function SlashMenu({
  editor,
  query,
  onClose,
  coords,
}: {
  editor: Editor;
  query: string;
  onClose: () => void;
  coords: { top: number; left: number };
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const selectItem = useCallback((item: SlashItem) => {
    // Delete the slash and query text
    const { from } = editor.state.selection;
    const deleteFrom = from - query.length - 1;
    editor
      .chain()
      .focus()
      .deleteRange({ from: deleteFrom, to: from })
      .run();

    item.command(editor);
    onClose();
  }, [editor, query, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          selectItem(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedIndex, filtered, onClose, selectItem]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-56 max-h-64 overflow-y-auto"
      style={{ top: coords.top, left: coords.left }}
    >
      {filtered.map((item, i) => (
        <button
          key={item.title}
          onClick={() => selectItem(item)}
          className={`w-full text-left px-3 py-2 flex flex-col ${
            i === selectedIndex ? "bg-gray-50" : "hover:bg-gray-50"
          }`}
        >
          <span className="text-sm text-gray-900">{item.title}</span>
          <span className="text-xs text-gray-400">{item.description}</span>
        </button>
      ))}
    </div>
  );
}

// --- Keyboard Shortcuts Extension ---
const SaveShortcut = Extension.create({
  name: "saveShortcut",

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        const event = new CustomEvent("editor-save");
        document.dispatchEvent(event);
        return true;
      },
    };
  },
});

// --- Main Editor ---

export function NoteEditor() {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashCoords, setSlashCoords] = useState({ top: 0, left: 0 });
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}`;
          }
          return "Write something, or type / for commands...";
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Highlight,
      Typography,
      SaveShortcut,
    ],
    editorProps: {
      attributes: {
        class: "prose-editor outline-none min-h-[60vh]",
      },
    },
    onUpdate: ({ editor }) => {
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 20),
        from
      );

      // Detect "/" at start of empty block or after space
      const slashMatch = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);
      if (slashMatch) {
        // Get cursor position in the viewport
        const coords = editor.view.coordsAtPos(from);
        setSlashCoords({
          top: coords.bottom + 4,
          left: coords.left,
        });
        setSlashOpen(true);
        setSlashQuery(slashMatch[1]);
      } else {
        setSlashOpen(false);
        setSlashQuery("");
      }
    },
    immediatelyRender: false,
  });

  editorRef.current = editor;

  // Auto-focus
  useEffect(() => {
    if (editor) {
      setTimeout(() => editor.commands.focus(), 100);
    }
  }, [editor]);

  const getMarkdown = useCallback((): string => {
    if (!editor) return "";
    // Convert editor HTML to markdown-ish text
    const json = editor.getJSON();
    return jsonToMarkdown(json);
  }, [editor]);

  const handleSave = useCallback(async () => {
    if (!editor || state === "saving") return;
    const content = getMarkdown().trim();
    if (!content) return;

    setState("saving");
    try {
      const res = await fetch("/api/notes/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setState("saved");
        editor.commands.clearContent();
        setTimeout(() => setState("idle"), 2000);
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  }, [editor, getMarkdown, state]);

  // Listen for save shortcut
  useEffect(() => {
    const handler = () => handleSave();
    document.addEventListener("editor-save", handler);
    return () => document.removeEventListener("editor-save", handler);
  }, [handleSave]);

  const hasContent = editor ? !editor.isEmpty : false;

  if (!editor) return null;

  return (
    <div className="relative">
      {slashOpen && (
        <div className="relative">
          <SlashMenu
            editor={editor}
            query={slashQuery}
            onClose={() => {
              setSlashOpen(false);
              setSlashQuery("");
            }}
          />
        </div>
      )}

      <EditorContent editor={editor} />

      {hasContent && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={handleSave}
            disabled={state === "saving"}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors disabled:cursor-not-allowed"
          >
            {state === "saving"
              ? "sending..."
              : state === "saved"
                ? "sent"
                : "send to self"}
          </button>
          <span className="text-xs text-gray-300 ml-3">⌘↵</span>
        </div>
      )}
    </div>
  );
}

// --- JSON to Markdown serializer ---

function jsonToMarkdown(doc: Record<string, unknown>): string {
  if (!doc.content) return "";
  return (doc.content as Record<string, unknown>[])
    .map((node) => nodeToMarkdown(node))
    .join("\n");
}

function nodeToMarkdown(node: Record<string, unknown>): string {
  const type = node.type as string;
  const attrs = (node.attrs || {}) as Record<string, unknown>;
  const content = node.content as Record<string, unknown>[] | undefined;

  switch (type) {
    case "paragraph":
      return inlineToMarkdown(content);

    case "heading": {
      const level = (attrs.level as number) || 1;
      const hashes = "#".repeat(level);
      return `${hashes} ${inlineToMarkdown(content)}`;
    }

    case "bulletList":
      return (content || [])
        .map((item) => {
          const inner = (item.content as Record<string, unknown>[]) || [];
          return inner
            .map((p, i) => (i === 0 ? `- ${inlineToMarkdown(p.content as Record<string, unknown>[])}` : `  ${inlineToMarkdown(p.content as Record<string, unknown>[])}`))
            .join("\n");
        })
        .join("\n");

    case "orderedList":
      return (content || [])
        .map((item, idx) => {
          const inner = (item.content as Record<string, unknown>[]) || [];
          return inner
            .map((p, i) => (i === 0 ? `${idx + 1}. ${inlineToMarkdown(p.content as Record<string, unknown>[])}` : `   ${inlineToMarkdown(p.content as Record<string, unknown>[])}`))
            .join("\n");
        })
        .join("\n");

    case "taskList":
      return (content || [])
        .map((item) => {
          const checked = (item.attrs as Record<string, unknown>)?.checked ? "x" : " ";
          const inner = (item.content as Record<string, unknown>[]) || [];
          return `- [${checked}] ${inner.map((p) => inlineToMarkdown(p.content as Record<string, unknown>[])).join("\n")}`;
        })
        .join("\n");

    case "blockquote":
      return (content || [])
        .map((p) => `> ${inlineToMarkdown(p.content as Record<string, unknown>[])}`)
        .join("\n");

    case "codeBlock": {
      const lang = (attrs.language as string) || "";
      const code = (content || [])
        .map((p) => (p as Record<string, unknown>).text || "")
        .join("");
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case "horizontalRule":
      return "---";

    default:
      return inlineToMarkdown(content);
  }
}

function inlineToMarkdown(content: Record<string, unknown>[] | undefined): string {
  if (!content) return "";
  return content
    .map((node) => {
      let text = (node.text as string) || "";
      const marks = (node.marks as Record<string, unknown>[]) || [];

      for (const mark of marks) {
        const markType = mark.type as string;
        if (markType === "bold") text = `**${text}**`;
        else if (markType === "italic") text = `*${text}*`;
        else if (markType === "strike") text = `~~${text}~~`;
        else if (markType === "code") text = `\`${text}\``;
        else if (markType === "underline") text = `__${text}__`;
        else if (markType === "highlight") text = `==${text}==`;
      }

      return text;
    })
    .join("");
}
