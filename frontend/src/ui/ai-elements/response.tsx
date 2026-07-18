"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

/**
 * Vercel AI Elements `Response` — renders streaming Markdown via `streamdown` (safe partial-markdown
 * parsing, code highlighting, tables). Memoized on `children` so only the actively streaming text node
 * re-renders. Prose styling comes from our global `.prose` / typography tokens.
 */
type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full space-y-3 text-sm leading-relaxed text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_a]:font-medium [&_a]:text-brand-teal [&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
        "[&_h1]:font-heading [&_h2]:font-heading [&_h3]:font-heading [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        className,
      )}
      {...props}
    />
  ),
  (prev, next) => prev.children === next.children,
);
Response.displayName = "Response";
