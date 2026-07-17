"use client";

import { StarIcon, XIcon } from "lucide-react";
import { QueryState } from "@/components/shared/query-state";
import { useRemoveProjectMember } from "@/hooks/queries/project/project.mutations";
import { useProjectMembers } from "@/hooks/queries/project/project.queries";
import { notify } from "@/lib/toast";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ReadinessBadge } from "./readiness";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProjectMemberPanel({
  projectId,
  manageable = false,
}: {
  projectId: string;
  manageable?: boolean;
}) {
  const { data: members, isLoading, isError, error } = useProjectMembers(projectId);
  const remove = useRemoveProjectMember(projectId);

  function handleRemove(employeeId: string, name: string) {
    remove.mutate(employeeId, {
      onSuccess: () => notify.success("Member removed", { description: name }),
      onError: (err) => notify.apiError(err, "Could not remove member"),
    });
  }

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={!!members && members.length === 0}
      empty={<p className="text-sm text-muted-foreground">No members on this project yet.</p>}
    >
      <ul className="divide-y divide-border">
        {members?.map((m) => (
          <li key={m.employeeId} className="flex items-center gap-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-mist text-xs font-semibold text-brand-ink">
              {initials(m.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{m.name}</p>
                {m.isGoTo && (
                  <Badge variant="success">
                    <StarIcon className="size-3" /> Go-to
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{m.role ?? m.domainName ?? "Member"}</span>
                {m.githubHandle && (
                  <a
                    href={`https://github.com/${m.githubHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    @{m.githubHandle}
                  </a>
                )}
              </div>
            </div>
            <ReadinessBadge readiness={m.readiness} />
            {manageable && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${m.name}`}
                disabled={remove.isPending}
                onClick={() => handleRemove(m.employeeId, m.name)}
              >
                <XIcon className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </QueryState>
  );
}
