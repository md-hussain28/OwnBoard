"use client";

import { Loader2Icon } from "lucide-react";
import { cn, useRotatingPun } from "@/lib";

type LoadingPunProps = {
  /** Extra classes for the wrapper. */
  className?: string;
  /** Show the little spinning icon before the text. Default true. */
  icon?: boolean;
  /** How often the pun rotates, in ms. Default 3400. */
  intervalMs?: number;
};

/**
 * A rotating, self-deprecating "please wait, we're cheap" line. Drop it under any
 * loading state (skeletons, a busy button, a full-screen wait) so the free-tier lag
 * feels charming instead of broken. Text is kept readable (sm) and fades on change.
 */
export function LoadingPun({ className, icon = true, intervalMs }: LoadingPunProps) {
  const pun = useRotatingPun(intervalMs);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground text-pretty",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {icon ? (
        <Loader2Icon className="size-4 shrink-0 animate-spin text-brand-amber" aria-hidden />
      ) : null}
      <span key={pun} className="animate-in fade-in slide-in-from-bottom-1 duration-500">
        {pun}
      </span>
    </div>
  );
}
