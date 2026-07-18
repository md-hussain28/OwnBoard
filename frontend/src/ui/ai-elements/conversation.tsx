"use client";

import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

/**
 * Vercel AI Elements `Conversation` — an auto-scrolling message container. It sticks to the newest
 * content while streaming (via `use-stick-to-bottom`) but releases the lock the moment the user
 * scrolls up, and surfaces a "jump to latest" button when they've scrolled away.
 */
export function Conversation({ className, ...props }: ComponentProps<typeof StickToBottom>) {
  return (
    <StickToBottom
      className={cn("relative flex-1 overflow-y-auto", className)}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    />
  );
}

export function ConversationContent({
  className,
  ...props
}: ComponentProps<typeof StickToBottom.Content>) {
  return <StickToBottom.Content className={cn("space-y-6 p-4", className)} {...props} />;
}

export function ConversationEmptyState({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex size-full flex-col items-center justify-center gap-3 p-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ConversationScrollButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-soft"
      onClick={() => scrollToBottom()}
      aria-label="Scroll to latest"
    >
      <ArrowDownIcon />
    </Button>
  );
}
