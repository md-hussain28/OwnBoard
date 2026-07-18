"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Vercel AI Elements `Message` — a single chat turn row. `from` drives alignment: user turns align
 * right in a filled bubble, assistant turns align left as full-width flowing content (so charts,
 * checklists, and citations get room to breathe).
 */
export function Message({
  className,
  from,
  ...props
}: ComponentProps<"div"> & { from: "user" | "assistant" | "system" }) {
  return (
    <div
      data-role={from}
      className={cn(
        "flex w-full gap-3",
        from === "user" ? "justify-end" : "justify-start",
        className,
      )}
      {...props}
    />
  );
}

export function MessageContent({
  className,
  variant = "flat",
  ...props
}: ComponentProps<"div"> & { variant?: "flat" | "contained" }) {
  return (
    <div
      className={cn(
        "min-w-0 text-sm",
        variant === "contained"
          ? "max-w-[85%] rounded-2xl rounded-br-md bg-brand-gradient px-3.5 py-2 text-primary-foreground shadow-button"
          : "flex-1 space-y-3",
        className,
      )}
      {...props}
    />
  );
}
