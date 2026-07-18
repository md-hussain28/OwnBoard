"use client";

import type { ChatStatus } from "ai";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import type { ComponentProps, FormEvent, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Spinner } from "@/ui/spinner";
import { Textarea } from "@/ui/textarea";

/**
 * Vercel AI Elements `PromptInput` — the chat composer. A native `<form>` whose `onSubmit` receives
 * the current text; Enter submits, Shift+Enter inserts a newline. Compose it with `PromptInputTextarea`,
 * `PromptInputToolbar`, and `PromptInputSubmit` (which mirrors the `useChat` status → send/stop).
 */
export function PromptInput({ className, ...props }: ComponentProps<"form">) {
  return (
    <form
      className={cn(
        "rounded-2xl border border-border bg-card p-2 shadow-soft transition-colors focus-within:border-primary/30",
        className,
      )}
      {...props}
    />
  );
}

export function PromptInputTextarea({
  className,
  onKeyDown,
  ...props
}: ComponentProps<typeof Textarea>) {
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
    onKeyDown?.(e);
  }

  return (
    <Textarea
      className={cn(
        "max-h-40 min-h-11 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0",
        className,
      )}
      rows={1}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export function PromptInputToolbar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 px-1 pt-1", className)}
      {...props}
    />
  );
}

export function PromptInputTools({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-1.5", className)} {...props} />;
}

/** Send button that flips to a Stop control while the assistant is streaming. */
export function PromptInputSubmit({
  status,
  disabled,
  onStop,
  className,
  ...props
}: ComponentProps<typeof Button> & { status?: ChatStatus; onStop?: () => void }) {
  const busy = status === "submitted" || status === "streaming";

  if (busy) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onStop}
        className={className}
        {...props}
      >
        {status === "submitted" ? <Spinner /> : <SquareIcon className="fill-current" />}
        Stop
      </Button>
    );
  }

  return (
    <Button type="submit" size="sm" disabled={disabled} className={className} {...props}>
      <ArrowUpIcon />
      Ask
    </Button>
  );
}

/** Submit payload shape passed to a `PromptInput`'s handler (kept minimal for our text-only composer). */
export type PromptInputMessage = { text: string };

/** Extracts the trimmed text from a form submit event's `message` textarea. */
export function readPromptText(event: FormEvent<HTMLFormElement>): string {
  const form = event.currentTarget;
  const textarea = form.elements.namedItem("message") as HTMLTextAreaElement | null;
  return (textarea?.value ?? "").trim();
}
