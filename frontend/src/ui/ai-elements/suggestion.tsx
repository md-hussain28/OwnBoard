"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib";

/**
 * Vercel AI Elements `Suggestion` — tappable starter prompts. `Suggestions` is a wrapping row;
 * each `Suggestion` fires `onClick(suggestion)` with its prompt text.
 */
export function Suggestions({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

export function Suggestion({
  suggestion,
  onClick,
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(suggestion)}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-soft transition-colors hover:border-brand-honey/40 hover:bg-brand-honey-soft/30",
        className,
      )}
      {...props}
    >
      {children ?? suggestion}
    </button>
  );
}
