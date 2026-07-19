"use client";

import { BookTextIcon, GraduationCapIcon, StarIcon, UsersIcon } from "lucide-react";
import { EmptyState, QueryState } from "@/components/shared";
import { useProjectMembers } from "@/hooks/queries/project";
import type { ProjectDetail, ProjectMember } from "@/schemas";
import { Progress } from "@/ui";
import { projectStatusMeta } from "./project-status";
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

/** A compact stat: a number and its label, kept inline (not a hero-metric card). */
function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-mist text-brand-ink">
        {icon}
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-semibold tabular-nums">{value}</span>
        <span className="block text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function MemberRow({ member }: { member: ProjectMember }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-mist text-xs font-semibold text-brand-ink">
        {initials(member.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{member.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {member.functionTypeName ?? member.role ?? "Member"}
        </span>
      </span>
      <ReadinessBadge readiness={member.readiness} />
    </li>
  );
}

export function ProjectOverviewTab({ project }: { project: ProjectDetail }) {
  const { data: members, isLoading, isError, error } = useProjectMembers(project.id);

  const roster = members ?? [];
  const onboarded = roster.filter((m) => !m.readiness.locked);
  const pending = roster.filter((m) => m.readiness.locked);
  const goTo = roster.filter((m) => m.isGoTo);
  const teamPct = roster.length ? Math.round((onboarded.length / roster.length) * 100) : 0;
  const statusHint = projectStatusMeta(project.status).hint;

  return (
    <div className="space-y-4">
      {statusHint && <p className="text-sm text-muted-foreground">{statusHint}</p>}

      <div className="rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <Stat icon={<UsersIcon className="size-4" />} value={roster.length} label="Members" />
          <Stat
            icon={<GraduationCapIcon className="size-4" />}
            value={project.tracks.length}
            label="Onboarding"
          />
          <Stat
            icon={<BookTextIcon className="size-4" />}
            value={project.modules.length}
            label="Docs"
          />
          <Stat icon={<StarIcon className="size-4" />} value={goTo.length} label="Go-to people" />
        </div>

        <div className="mt-5 space-y-1.5 border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Team module progress</span>
            <span className="text-muted-foreground">
              {onboarded.length} of {roster.length} caught up
            </span>
          </div>
          <Progress value={teamPct} />
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={roster.length === 0}
        empty={
          <EmptyState
            icon={UsersIcon}
            tone="mist"
            title="No members yet"
            description="Add people from the Members tab to start their onboarding."
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold">Working through modules</h3>
            {pending.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Everyone is caught up on their modules. 🎉
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-border">
                {pending.map((m) => (
                  <MemberRow key={m.employeeId} member={m} />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold">Go-to people</h3>
            {goTo.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No one has finished onboarding yet — go-to people show up here once they do.
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-border">
                {goTo.map((m) => (
                  <MemberRow key={m.employeeId} member={m} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </QueryState>
    </div>
  );
}
