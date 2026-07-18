"use client";

import { GitBranchIcon, UsersIcon } from "lucide-react";
import { EmptyState, QueryState } from "@/components/shared";
import { useProjectMembers, useProjectSkills } from "@/hooks/queries/project";
import type { ProjectDetail, ProjectMemberSkills } from "@/schemas";
import { Badge } from "@/ui";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * The employee's project Overview: who's on the team, what each person works on (simple
 * commit-derived skills — no raw history), and who owns which repo. View-only.
 */
export function MemberOverview({ project }: { project: ProjectDetail }) {
  const { data: members, isLoading, isError, error } = useProjectMembers(project.id);
  const { data: skills } = useProjectSkills(project.id);
  const skillsByEmployee = new Map<string, ProjectMemberSkills>(
    (skills ?? []).map((s) => [s.employeeId, s]),
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold tracking-tight">Your team</h2>
        </div>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!!members && members.length === 0}
          empty={
            <EmptyState
              icon={UsersIcon}
              tone="mist"
              title="No one else is on this project yet"
              description="Teammates will show up here as they're added to the project."
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(members ?? []).map((m) => {
              const s = skillsByEmployee.get(m.employeeId);
              const topSkills = s?.skills.slice(0, 4) ?? [];
              return (
                <div key={m.employeeId} className="flex gap-3 rounded-xl border border-border p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-mist text-xs font-semibold text-brand-ink">
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      {m.isLead && <Badge variant="default">Lead</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.functionTypeName ?? m.role ?? "Member"}
                    </p>
                    {topSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {topSkills.map((skill) => (
                          <Badge key={skill.name} variant="secondary">
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/70">
                        No commit-derived skills yet
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </QueryState>
      </section>

      {project.repos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranchIcon className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold tracking-tight">Who works on what</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {project.repos.map((r) => (
              <div key={r.repoId} className="space-y-2 rounded-xl border border-border p-4">
                <p className="truncate text-sm font-medium">{r.name ?? r.url ?? r.repoId}</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.assignees.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No one assigned yet</span>
                  ) : (
                    r.assignees.map((a) => (
                      <Badge key={a.employeeId} variant="secondary">
                        {a.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
