"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/ui/spinner";

/**
 * Vercel AI Elements `Loader` — a compact "thinking" indicator shown while the assistant works
 * before its first token lands.
 */
export function Loader({
  className,
  label = "Thinking…",
  ...props
}: ComponentProps<"div"> & { label?: string }) {
  return (
    <div
      className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
      {...props}
    >
      <Spinner className="text-brand-teal" />
      {label}
    </div>
  );
}
