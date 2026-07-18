"use client";

import { MessageSquarePlusIcon, MessagesSquareIcon, Trash2Icon } from "lucide-react";
import type { AskThread } from "@/components/ask/use-ask-threads";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ui/sheet";

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
      <SheetContent side="left" className="w-full gap-0 sm:max-w-xs">
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
            <div className="mt-8 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
              <MessagesSquareIcon className="size-6 text-muted-foreground/50" />
              No conversations yet.
            </div>
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
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(t.updatedAt)}
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
