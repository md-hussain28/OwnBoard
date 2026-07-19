"use client";

import type { ComponentProps } from "react";
import { cn, useRotatingPun } from "@/lib";

/**
 * Vercel AI Elements `Loader` — a compact "thinking" indicator shown while the assistant works
 * before its first token lands. Three honey dots breathe in sequence next to a shimmering label.
 *
 * Pass `pun` to swap the static label for a rotating free-tier joke, so a slow answer on our
 * 0.1-CPU host feels charming instead of stuck. An explicit `label` always wins over `pun`.
 */
export function Loader({
  className,
  label,
  pun = false,
  ...props
}: ComponentProps<"div"> & { label?: string; pun?: boolean }) {
  const rotating = useRotatingPun();
  const text = label ?? (pun ? rotating : "Thinking…");

  return (
    <div className={cn("flex items-center gap-2.5", className)} {...props}>
      <span className="flex items-center gap-1" aria-hidden>
        <span className="size-1.5 animate-pulse rounded-full bg-brand-honey [animation-delay:-0.4s] [animation-duration:1.1s]" />
        <span className="size-1.5 animate-pulse rounded-full bg-brand-honey [animation-delay:-0.2s] [animation-duration:1.1s]" />
        <span className="size-1.5 animate-pulse rounded-full bg-brand-honey [animation-duration:1.1s]" />
      </span>
      <span key={text} className="animate-pulse text-sm text-muted-foreground text-pretty">
        {text}
      </span>
    </div>
  );
}
