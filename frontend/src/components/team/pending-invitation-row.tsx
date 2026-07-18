"use client";

import { MailIcon } from "lucide-react";
import { useRevokeInvitation } from "@/hooks/queries/employee";
import { cn, notify } from "@/lib";
import type { EmployeeInvitation } from "@/schemas";
import { Badge, Button, Spinner } from "@/ui";
import { displayJobTitle, initials, ROLE_META } from "./team-constants";

function inviteSubtitle(invitation: EmployeeInvitation): string {
  const domain = invitation.domainName?.trim() || null;
  const title = displayJobTitle(invitation.role);
  const parts = [domain, title].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return "Waiting to accept";
}

export function PendingInvitationRow({ invitation }: { invitation: EmployeeInvitation }) {
  const revoke = useRevokeInvitation();
  const roleMeta = ROLE_META[invitation.appRole];

  function handleRevoke() {
    revoke.mutate(invitation.id, {
      onSuccess: () => {
        notify.success("Invitation revoked", {
          description: invitation.emailAddress,
          id: `invite-revoke:${invitation.id}`,
        });
      },
      onError: (err) => {
        notify.apiError(err, "Could not revoke invitation", {
          id: `invite-revoke-error:${invitation.id}`,
        });
      },
    });
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl px-2 py-2.5",
        "transition-colors duration-150 sm:gap-x-3 sm:px-3 sm:py-3",
        "hover:bg-muted/60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-amber/10 text-[0.6875rem] font-semibold tracking-wide text-brand-amber sm:size-9 sm:text-xs"
        >
          {initials(invitation.emailAddress.split("@")[0] ?? "?")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug sm:text-base">
            {invitation.emailAddress}
          </p>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            {inviteSubtitle(invitation)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MailIcon className="size-3 shrink-0" aria-hidden />
            <span className="truncate">Invite pending</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Badge variant="warning" className="h-5 px-1.5 text-[0.65rem]">
          Pending
        </Badge>
        <Badge
          variant="secondary"
          className={cn(
            "h-5 gap-1 px-1.5 text-[0.65rem]",
            invitation.appRole === "admin" && "border-primary/25 bg-primary/10 text-foreground",
          )}
        >
          <roleMeta.Icon className="size-2.5" aria-hidden />
          {roleMeta.label}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRevoke}
          disabled={revoke.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          {revoke.isPending && <Spinner className="size-3.5" />}
          Revoke
        </Button>
      </div>
    </li>
  );
}
