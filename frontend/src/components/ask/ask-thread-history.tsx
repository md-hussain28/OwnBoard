"use client";

import { ClockIcon, MessageSquarePlusIcon, MessagesSquareIcon, Trash2Icon } from "lucide-react";
import { EmptyState } from "@/components/shared";
import { cn } from "@/lib";
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ui";
import type { AskThread } from "./use-ask-threads";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return day < 7 ? `${day}d ago` : new Date(ts).toLocaleDateString();
}

function absoluteTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function countQuestions(messages: AskThread["messages"]): number {
  return messages.filter((m) => m.role === "user").length;
}

export function AskThreadHistory({
  open,
  onOpenChange,
  threads,
  activeId,
  onSelect,
  onNew,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threads: AskThread[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>Conversation history</SheetTitle>
          <SheetDescription>
            Your past questions about this project, on this device.
          </SheetDescription>
        </SheetHeader>

        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onNew();
              onOpenChange(false);
            }}
          >
            <MessageSquarePlusIcon />
            New conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {threads.length === 0 ? (
            <EmptyState
              icon={MessagesSquareIcon}
              tone="mist"
              compact
              bordered={false}
              title="No conversations yet"
              description="Ask your first question about this project to start one."
            />
          ) : (
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.id} className="group/thread relative">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(t.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "w-full rounded-lg px-2.5 py-2 pr-8 text-left transition-colors hover:bg-muted",
                      t.id === activeId && "bg-brand-mist",
                    )}
                  >
                    <span className="block truncate text-sm font-medium text-foreground">
                      {t.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <time
                        dateTime={new Date(t.updatedAt).toISOString()}
                        title={absoluteTime(t.updatedAt)}
                      >
                        {relativeTime(t.updatedAt)}
                      </time>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <MessagesSquareIcon className="size-3" />
                        {countQuestions(t.messages)}{" "}
                        {countQuestions(t.messages) === 1 ? "question" : "questions"}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
                      <ClockIcon className="size-3" />
                      Started {absoluteTime(t.createdAt ?? t.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    onClick={() => onRemove(t.id)}
                    className="absolute top-2 right-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/thread:opacity-100"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
