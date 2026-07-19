"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib";
import { getApiErrorMessage } from "@/lib/api";
import type { EmployeeInvitation } from "@/schemas";
import { Skeleton } from "@/ui";
import { PendingInvitationRow } from "./pending-invitation-row";

export function PendingInvitationsSection({
  invitations,
  isLoading,
  isError,
  error,
}: {
  invitations: EmployeeInvitation[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <section className="space-y-3" aria-labelledby="pending-invites-heading">
        <h2 id="pending-invites-heading" className="text-sm font-semibold">
          Pending invites
        </h2>
        <div className="space-y-2 rounded-xl border border-border p-2">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-3" aria-labelledby="pending-invites-heading">
        <h2 id="pending-invites-heading" className="text-sm font-semibold">
          Pending invites
        </h2>
        <p className="rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground">
          Could not load invitations ({getApiErrorMessage(error)}).
        </p>
      </section>
    );
  }

  if (invitations.length === 0) return null;

  const countLabel = `${invitations.length} ${invitations.length === 1 ? "invite" : "invites"}`;

  return (
    <section className="space-y-3" aria-labelledby="pending-invites-heading">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="pending-invites-list"
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left shadow-soft",
          "transition-colors duration-150 hover:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <h2 id="pending-invites-heading" className="min-w-0 flex-1 text-sm font-semibold">
          Pending invites
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">{countLabel}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul
          id="pending-invites-list"
          className="rounded-xl border border-border bg-card p-1.5 shadow-soft"
        >
          {invitations.map((invitation) => (
            <PendingInvitationRow key={invitation.id} invitation={invitation} />
          ))}
        </ul>
      )}
    </section>
  );
}
