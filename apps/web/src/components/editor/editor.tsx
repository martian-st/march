"use client";

import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  ImageResizer,
  type JSONContent,
} from "novel";
import { useState } from "react";
import { defaultExtensions } from "./extentions";
import "./editor.css";
import EditorMenu from "./editor-menu";
import { NodeSelector } from "./selectors/node-selector";
import { Separator } from "../ui/separator";
import { LinkSelector } from "./selectors/link-selector";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";
import { ColorSelector } from "./selectors/color-selector";

const extensions = [...defaultExtensions, slashCommand];

export const defaultEditorContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [],
    },
  ],
};

interface EditorProps {
  initialValue?: JSONContent;
  onChange: (content: string) => void;
  placeholder?: string;
}

const Editor = ({ initialValue, onChange }: EditorProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [isLinkSelectorOpen, setIsLinkSelectorOpen] = useState(false);
  const [isColorSelectorOpen, setIsColorSelectorOpen] = useState(false);

  if (!initialValue) return null;

  return (
    <EditorRoot>
      <EditorContent
        immediatelyRender={false}
        initialContent={initialValue}
        extensions={extensions}
        className="min-h-96 w-full"
        editorProps={{
          attributes: {
            class:
              "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none w-full",
          },
        }}
        onUpdate={({ editor }) => {
          onChange(JSON.stringify(editor.getJSON()));
        }}
        slotAfter={<ImageResizer />}
      >
        {/**editor command */}
        <EditorCommand
          className="border-muted bg-background fixed z-[9999] h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border px-1 py-2 shadow-md transition-all"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
            }
          }}
        >
          <EditorCommandEmpty className="text-muted-foreground px-2">
            No results
          </EditorCommandEmpty>
          <EditorCommandList className="pointer-events-auto">
            {suggestionItems.map((item) => (
              <EditorCommandItem
                value={item.title}
                onCommand={(val) => {
                  const commandProps = {
                    editor: val.editor,
                    range: val.range,
                  };
                  item.command?.(commandProps);
                }}
                className="hover:bg-accent aria-selected:bg-accent flex w-full cursor-pointer items-center space-x-2 rounded-md px-2 py-1 text-left text-[10px]"
                key={item.title}
              >
                <div className="border-muted bg-background flex h-8 w-8 items-center justify-center rounded-md border">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-[8px]">
                    {item.description}
                  </p>
                </div>
              </EditorCommandItem>
            ))}
          </EditorCommandList>
        </EditorCommand>

        <EditorMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <NodeSelector
            open={isNodeSelectorOpen}
            onOpenChange={setIsNodeSelectorOpen}
          />
          <Separator orientation="vertical" />
          <TextButtons />
          <Separator orientation="vertical" />
          <LinkSelector
            open={isLinkSelectorOpen}
            onOpenChange={setIsLinkSelectorOpen}
          />
          <Separator orientation="vertical" />
          <ColorSelector
            open={isColorSelectorOpen}
            onOpenChange={setIsColorSelectorOpen}
          />
        </EditorMenu>
      </EditorContent>
    </EditorRoot>
  );
};
export default Editor;
