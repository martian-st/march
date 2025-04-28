"use client";

import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { MarkdownText } from "../assistant-ui/markdown-text";
import * as Avatar from "@radix-ui/react-avatar";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  Pencil1Icon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import type { ComponentPropsWithoutRef, FC } from "react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import React from "react";
import { Bot } from "lucide-react";

export const Agent: FC = () => {
  const Composer = () => (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-screen-md items-end rounded-3xl bg-muted/50 pl-2">
      <ComposerPrimitive.Input
        placeholder="Message Agent"
        className="h-12 max-h-40 flex-grow resize-none bg-transparent p-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <ThreadPrimitive.If running={false}>
        <ComposerPrimitive.Send className="m-2 flex size-8 items-center justify-center rounded-full bg-primary transition-opacity disabled:opacity-10">
          <ArrowUpIcon className="size-5 text-primary-foreground" />
        </ComposerPrimitive.Send>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running>
        <ComposerPrimitive.Cancel className="m-2 flex size-8 items-center justify-center rounded-full bg-white">
          <div className="size-2.5 bg-black" />
        </ComposerPrimitive.Cancel>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  );

  return (
    <TooltipProvider>
      <ThreadPrimitive.Root className="text-foreground flex h-full flex-col items-stretch bg-background px-4">
        <ThreadPrimitive.Viewport className="flex flex-grow flex-col gap-8 overflow-y-scroll pt-16">
          <ThreadPrimitive.Empty>
            <div className="flex flex-grow flex-col items-center justify-center">
              <Avatar.Root className="flex h-12 w-12 items-center justify-center">
                <Avatar.AvatarFallback>
                  <Bot />
                </Avatar.AvatarFallback>
              </Avatar.Root>
              <p className="mt-4 mb-6 text-xl text-foreground">
                How can I help you today?
              </p>
              <Composer />
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              EditComposer,
              AssistantMessage,
            }}
          />
        </ThreadPrimitive.Viewport>

        <ThreadPrimitive.If empty={false}>
          <Composer />
          <p className="p-2 text-center text-xs text-muted-foreground">
            Agent can make mistakes. Check important info.
          </p>
        </ThreadPrimitive.If>
      </ThreadPrimitive.Root>
    </TooltipProvider>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-screen-md flex-col items-end gap-1">
      <div className="flex items-start gap-4">
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          autohideFloat="single-branch"
          className="mt-2"
        >
          <ActionBarPrimitive.Edit asChild>
            <ActionButton tooltip="Edit">
              <Pencil1Icon />
            </ActionButton>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        <div className="rounded-3xl bg-muted/50 px-5 py-2 text-foreground">
          <MessagePrimitive.Content />
        </div>
      </div>

      <BranchPicker className="mr-3 mt-2" />
    </MessagePrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-screen-md flex-col justify-end gap-1 rounded-3xl bg-muted">
      <ComposerPrimitive.Input className="flex h-8 w-full resize-none bg-transparent p-5 pb-0 text-foreground outline-none" />

      <div className="m-3 mt-2 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel className="rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90">
          Cancel
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Send
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-screen-md gap-3">
      <Avatar.Root className="flex size-8 flex-shrink-0 items-center justify-center rounded-[24px] border border-border shadow">
        <Avatar.AvatarFallback className="text-xs text-foreground">
          C
        </Avatar.AvatarFallback>
      </Avatar.Root>

      <div className="pt-1">
        <div className="text-foreground">
          <MessagePrimitive.Content components={{ Text: MarkdownText }} />
        </div>

        <div className="flex pt-2">
          <BranchPicker />

          <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            autohideFloat="single-branch"
            className="flex items-center gap-1 rounded-lg data-[floating]:absolute data-[floating]:border-2 data-[floating]:p-1"
          >
            <ActionBarPrimitive.Reload asChild>
              <ActionButton tooltip="Reload">
                <ReloadIcon />
              </ActionButton>
            </ActionBarPrimitive.Reload>
            <ActionBarPrimitive.Copy asChild>
              <ActionButton tooltip="Copy">
                <MessagePrimitive.If copied>
                  <CheckIcon />
                </MessagePrimitive.If>
                <MessagePrimitive.If copied={false}>
                  <CopyIcon />
                </MessagePrimitive.If>
              </ActionButton>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<{ className?: string }> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "inline-flex items-center text-sm font-semibold text-muted-foreground",
        className,
      )}
    >
      <BranchPickerPrimitive.Previous asChild>
        <ActionButton tooltip="Previous">
          <ChevronLeftIcon />
        </ActionButton>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
      <BranchPickerPrimitive.Next asChild>
        <ActionButton tooltip="Next">
          <ChevronRightIcon />
        </ActionButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

type ActionButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  tooltip: string;
};

const ActionButton: FC<ActionButtonProps> = ({
  tooltip,
  className,
  children,
  ...rest
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-auto p-1 text-muted-foreground", className)}
          {...rest}
        >
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
};
