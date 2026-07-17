"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  GitBranchIcon,
  LockIcon,
  UnlockIcon,
} from "lucide-react";
import Link from "next/link";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ProjectDetail, ProjectTrack } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { MemberModulesList } from "./member-modules-list";
import { ProjectContextView } from "./project-context-view";
import { ProjectMemberPanel } from "./project-member-panel";
import { ReadinessBar } from "./readiness";

function TrackStatusPill({ track }: { track: ProjectTrack }) {
  if (track.passed) return <Badge variant="success">Passed</Badge>;
  if (track.assignmentId) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        Start <ArrowRightIcon className="size-4" />
      </span>
    );
  }
  return <Badge variant="secondary">Not ready</Badge>;
}

function TrackRow({ track }: { track: ProjectTrack }) {
  const clickable = !track.passed && !!track.assignmentId;
  const body = (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3",
        track.passed ? "border-brand-moss/40 bg-brand-moss-soft" : "border-border",
        clickable && "transition-shadow duration-200 hover:shadow-soft",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {track.passed ? (
          <CheckCircle2Icon className="size-5 shrink-0 text-brand-moss" />
        ) : (
          <LockIcon className="size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{track.name}</p>
          {track.description && (
            <p className="truncate text-sm text-muted-foreground">{track.description}</p>
          )}
          {(track.estimatedMinutes != null || track.dueOffsetDays != null) && (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {track.estimatedMinutes != null && (
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="size-3.5" /> {track.estimatedMinutes} min
                </span>
              )}
              {track.dueOffsetDays != null && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClockIcon className="size-3.5" /> due in {track.dueOffsetDays} day
                  {track.dueOffsetDays === 1 ? "" : "s"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <TrackStatusPill track={track} />
      </div>
    </div>
  );

  if (clickable && track.assignmentId) {
    return <Link href={appPath("onboarding", "packs", track.assignmentId)}>{body}</Link>;
  }
  return body;
}

export function MemberProjectDetail({ project }: { project: ProjectDetail }) {
  const locked = project.locked;
  const readiness = project.myReadiness;

  return (
    <div className="space-y-6">
      <Link
        href={appPath("projects")}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> My projects
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {locked ? (
            <LockIcon className="size-5 text-muted-foreground" />
          ) : (
            <UnlockIcon className="size-5 text-brand-moss" />
          )}
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        </div>
        {project.description && <p className="text-muted-foreground">{project.description}</p>}
      </div>

      {readiness && (
        <Card className={locked ? "border-brand-amber/40 bg-brand-amber-soft/40" : undefined}>
          <CardContent className="space-y-3 py-5">
            <p className="text-sm font-medium">
              {locked
                ? "Complete this project's onboarding to unlock it"
                : "You're onboarded — you have access to this project"}
            </p>
            <ReadinessBar readiness={readiness} />
          </CardContent>
        </Card>
      )}

      {/* Onboarding tracks that gate the project. */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Onboarding modules
        </h2>
        {project.tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This project has no onboarding modules yet.
          </p>
        ) : (
          <div className="space-y-2">
            {project.tracks.map((track) => (
              <TrackRow key={track.id} track={track} />
            ))}
          </div>
        )}
      </div>

      {/* Reference context to help a new joinee understand the project — available even while locked. */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          About this project
        </h2>
        <ProjectContextView project={project} />
      </div>

      {/* Dev-facing modules assigned to this member by their function. */}
      {project.modules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your modules
          </h2>
          <MemberModulesList projectId={project.id} modules={project.modules} />
        </div>
      )}

      {/* The member panel + go-to people are revealed once the project is unlocked. */}
      {locked ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
            <LockIcon className="size-4 shrink-0" />
            The team panel unlocks once you&apos;ve passed every onboarding module above.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Team</CardTitle>
            {project.repoName && (
              <a
                href={project.repoUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <GitBranchIcon className="size-3.5" /> {project.repoName}
              </a>
            )}
          </CardHeader>
          <CardContent>
            <ProjectMemberPanel projectId={project.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
