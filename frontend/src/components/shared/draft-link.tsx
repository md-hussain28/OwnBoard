"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn, isDraftId } from "@/lib";

type DraftLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  /** Entity id backing this link. A client draft id (`new_…`) makes the link inert. */
  entityId: string;
};

/**
 * A `next/link` that stays inert while its entity is still being created. Optimistic list rows carry
 * a client `new_…` draft id (see `isDraftId` in `src/lib/ids.ts`) that can't resolve on the backend —
 * a live link would 404 — so until the mutation swaps in the persisted id this renders a dimmed,
 * non-interactive, `aria-busy` element that reads as "creating…" rather than navigating. Drop-in for
 * any `<Link>` whose href embeds an id that might be optimistic; pass that id as `entityId`.
 */
export function DraftLink({ entityId, className, children, ...rest }: DraftLinkProps) {
  if (isDraftId(entityId)) {
    return (
      <span
        aria-disabled
        aria-busy
        title="Creating…"
        className={cn("pointer-events-none animate-pulse opacity-60", className)}
      >
        {children}
      </span>
    );
  }
  return (
    <Link className={className} {...rest}>
      {children}
    </Link>
  );
}
