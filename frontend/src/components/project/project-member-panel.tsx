"use client";

import { CrownIcon, SettingsIcon, StarIcon, XIcon } from "lucide-react";
import { QueryState } from "@/components/shared/query-state";
import {
  useRemoveProjectMember,
  useUpdateProjectMember,
} from "@/hooks/queries/project/project.mutations";
import {
  useProjectFunctionTypes,
  useProjectMembers,
} from "@/hooks/queries/project/project.queries";
import { notify } from "@/lib/toast";
import type { ProjectMember } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
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
  const { data: functionTypes } = useProjectFunctionTypes(projectId, manageable);
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{m.name}</p>
                {m.isLead && (
                  <Badge variant="default">
                    <CrownIcon className="size-3" /> Lead
                  </Badge>
                )}
                {m.functionTypeName && <Badge variant="secondary">{m.functionTypeName}</Badge>}
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
              <MemberManagePopover
                projectId={projectId}
                member={m}
                functionTypes={functionTypes ?? []}
                onRemove={() => handleRemove(m.employeeId, m.name)}
              />
            )}
          </li>
        ))}
      </ul>
    </QueryState>
  );
}

function MemberManagePopover({
  projectId,
  member,
  functionTypes,
  onRemove,
}: {
  projectId: string;
  member: ProjectMember;
  functionTypes: { id: string; name: string }[];
  onRemove: () => void;
}) {
  const update = useUpdateProjectMember(projectId);

  function setFunction(value: string) {
    update.mutate(
      {
        employeeId: member.employeeId,
        input: { functionTypeId: value },
      },
      { onError: (err) => notify.apiError(err, "Could not set role") },
    );
  }

  function toggleLead() {
    update.mutate(
      { employeeId: member.employeeId, input: { isLead: !member.isLead } },
      {
        onSuccess: () =>
          notify.success(member.isLead ? "Lead removed" : "Promoted to team lead", {
            description: member.name,
          }),
        onError: (err) => notify.apiError(err, "Could not update lead"),
      },
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Manage ${member.name}`}>
          <SettingsIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Role</span>
          <Select value={member.functionTypeId ?? ""} onValueChange={setFunction}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a role" />
            </SelectTrigger>
            <SelectContent>
              {functionTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={toggleLead}>
          <CrownIcon className="size-4" />
          {member.isLead ? "Remove as lead" : "Make team lead"}
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={onRemove}>
          <XIcon className="size-4" /> Remove from project
        </Button>
      </PopoverContent>
    </Popover>
  );
}
