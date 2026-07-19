"use client";

import {
  BookTextIcon,
  ClockIcon,
  CrownIcon,
  GitBranchIcon,
  GraduationCapIcon,
  StarIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import { EmptyState, QueryState } from "@/components/shared";
import { useProjectMembers } from "@/hooks/queries/project";
import type { ProjectDetail, ProjectMember, ProjectTrack } from "@/schemas";
import { Badge, Progress } from "@/ui";
import { projectStatusMeta } from "./project-status";
import { ReadinessBadge, ReadinessBar, readinessLabel } from "./readiness";

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

/** One inline count in the readiness legend under the team progress bar. */
function LegendCount({ dot, value, label }: { dot: string; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
      <span className="font-medium text-foreground tabular-nums">{value}</span> {label}
    </span>
  );
}

/** Short human summary of an onboarding track's combinable audience. */
function audienceSummary(track: ProjectTrack): string {
  if (track.targetAllMembers) return "Everyone";
  const parts: string[] = [];
  if (track.domainNames.length) parts.push(track.domainNames.join(", "));
  if (track.repoRules.length)
    parts.push(`${track.repoRules.length} repo rule${track.repoRules.length === 1 ? "" : "s"}`);
  if (track.manualEmployeeIds.length) parts.push(`${track.manualEmployeeIds.length} hand-picked`);
  return parts.length ? parts.join(" · ") : "No one yet";
}

/** A small icon + text meta chip, matching the tracks-tab row meta line. */
function MetaChip({ icon: Icon, children }: { icon: typeof ClockIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3" />
      {children}
    </span>
  );
}

/** One onboarding track in the breakdown: what it is, who it targets, how much is assigned. */
function TrackRow({ track }: { track: ProjectTrack }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-mist text-xs font-semibold text-brand-ink tabular-nums">
        {track.sequenceOrder + 1}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{track.name}</span>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <MetaChip icon={track.targetAllMembers ? UsersRoundIcon : GitBranchIcon}>
            {audienceSummary(track)}
          </MetaChip>
          <MetaChip icon={UsersIcon}>{track.assignedCount} assigned</MetaChip>
          {track.estimatedMinutes != null && (
            <MetaChip icon={ClockIcon}>{track.estimatedMinutes} min</MetaChip>
          )}
        </div>
      </div>
    </li>
  );
}

/** A member with their standing on the project. `showProgress` adds a per-member module bar. */
function MemberRow({
  member,
  showProgress = false,
}: {
  member: ProjectMember;
  showProgress?: boolean;
}) {
  const subtitle = member.functionTypeName ?? member.domainName ?? member.role ?? "Member";
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-mist text-xs font-semibold text-brand-ink">
          {initials(member.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{member.name}</span>
            {member.isLead && (
              <CrownIcon className="size-3 shrink-0 text-brand-honey" aria-label="Lead" />
            )}
            {member.isGoTo && (
              <StarIcon className="size-3 shrink-0 text-brand-honey" aria-label="Go-to" />
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle}
            {member.githubHandle ? ` · @${member.githubHandle}` : ""}
          </span>
        </span>
        <ReadinessBadge readiness={member.readiness} />
      </div>
      {showProgress && member.readiness.totalTracks > 0 && (
        <div className="mt-2 pl-11">
          <ReadinessBar readiness={member.readiness} />
        </div>
      )}
    </li>
  );
}

/** Order the roster so the people who need attention sit at the top. */
const READINESS_RANK: Record<string, number> = {
  locked: 0,
  "in-progress": 1,
  ready: 2,
  open: 3,
};

export function ProjectOverviewTab({ project }: { project: ProjectDetail }) {
  const { data: members, isLoading, isError, error } = useProjectMembers(project.id);

  const roster = members ?? [];
  const onboarded = roster.filter((m) => !m.readiness.locked);
  const goTo = roster.filter((m) => m.isGoTo);
  const teamPct = roster.length ? Math.round((onboarded.length / roster.length) * 100) : 0;
  const statusHint = projectStatusMeta(project.status).hint;

  const ready = roster.filter((m) => readinessLabel(m.readiness) === "ready");
  const inProgress = roster.filter((m) => readinessLabel(m.readiness) === "in-progress");
  const notStarted = roster.filter((m) => readinessLabel(m.readiness) === "locked");

  const rosterByAttention = [...roster].sort(
    (a, b) => READINESS_RANK[readinessLabel(a.readiness)] - READINESS_RANK[readinessLabel(b.readiness)],
  );
  const tracks = [...project.tracks].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

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

        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Team module progress</span>
            <span className="text-muted-foreground">
              {onboarded.length} of {roster.length} caught up
            </span>
          </div>
          <Progress value={teamPct} />
          {roster.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
              <LegendCount dot="bg-success" value={ready.length} label="ready" />
              <LegendCount dot="bg-warning" value={inProgress.length} label="in progress" />
              <LegendCount dot="bg-muted-foreground/50" value={notStarted.length} label="not started" />
            </div>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Onboarding breakdown</h3>
          <Badge variant="secondary" className="tabular-nums">
            {tracks.length} track{tracks.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {tracks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No onboarding tracks yet — add them from the Onboarding tab.
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-border">
            {tracks.map((t) => (
              <TrackRow key={t.id} track={t} />
            ))}
          </ul>
        )}
      </section>

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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Member readiness</h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {ready.length}/{roster.length} ready
              </span>
            </div>
            {notStarted.length + inProgress.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Everyone is caught up on their modules. 🎉
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                People who still have modules to finish are listed first.
              </p>
            )}
            <ul className="mt-1 divide-y divide-border">
              {rosterByAttention.map((m) => (
                <MemberRow key={m.employeeId} member={m} showProgress />
              ))}
            </ul>
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
