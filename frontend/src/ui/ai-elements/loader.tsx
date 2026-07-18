"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib";

/**
 * Vercel AI Elements `Loader` — a compact "thinking" indicator shown while the assistant works
 * before its first token lands. Three honey dots breathe in sequence next to a shimmering label.
 */
export function Loader({
  className,
  label = "Thinking…",
  ...props
}: ComponentProps<"div"> & { label?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} {...props}>
      <span className="flex items-center gap-1" aria-hidden>
        <span className="size-1.5 animate-pulse rounded-full bg-brand-honey [animation-delay:-0.4s] [animation-duration:1.1s]" />
        <span className="size-1.5 animate-pulse rounded-full bg-brand-honey [animation-delay:-0.2s] [animation-duration:1.1s]" />
        <span className="size-1.5 animate-pulse rounded-full bg-brand-honey [animation-duration:1.1s]" />
      </span>
      <span className="animate-pulse text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
