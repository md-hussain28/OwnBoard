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
import { ProjectStatusBadge } from "./project-status";
import { ReadinessBar } from "./readiness";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

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
        <div className="flex flex-wrap items-center gap-2">
          {locked ? (
            <LockIcon className="size-5 text-muted-foreground" />
          ) : (
            <UnlockIcon className="size-5 text-brand-moss" />
          )}
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        {project.description && (
          <p className="max-w-2xl text-muted-foreground">{project.description}</p>
        )}
      </div>

      {readiness && (
        <Card className={locked ? "border-brand-amber/40 bg-brand-amber-soft/40" : undefined}>
          <CardContent className="space-y-3 py-5">
            <p className="text-sm font-medium">
              {locked
                ? "Finish your onboarding to unlock full access to this project"
                : "You're onboarded — you have full access to this project"}
            </p>
            <ReadinessBar readiness={readiness} />
          </CardContent>
        </Card>
      )}

      {/* What to do next: the onboarding steps that gate the project. */}
      <div className="space-y-3">
        <SectionHeading>Your onboarding</SectionHeading>
        {project.tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This project has no onboarding steps yet — you already have access.
          </p>
        ) : (
          <div className="space-y-2">
            {project.tracks.map((track) => (
              <TrackRow key={track.id} track={track} />
            ))}
          </div>
        )}
      </div>

      {/* Get oriented — everything below is visible from day one, even before onboarding is done. */}
      <div className="space-y-3">
        <SectionHeading>About this project</SectionHeading>
        <ProjectContextView project={project} />
      </div>

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
          <p className="mb-3 text-sm text-muted-foreground">
            Who&apos;s on this project and who to ask — a <span className="font-medium">Go-to</span>{" "}
            badge marks people who&apos;ve finished onboarding.
          </p>
          <ProjectMemberPanel projectId={project.id} />
        </CardContent>
      </Card>

      {/* Dev-facing docs assigned to this member by their function. */}
      {project.modules.length > 0 && (
        <div className="space-y-3">
          <SectionHeading>Docs</SectionHeading>
          <MemberModulesList projectId={project.id} modules={project.modules} />
        </div>
      )}
    </div>
  );
}
