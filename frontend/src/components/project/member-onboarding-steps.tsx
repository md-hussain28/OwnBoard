"use client";

import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  LockIcon,
} from "lucide-react";
import Link from "next/link";
import { appPath, cn } from "@/lib";
import type { ProjectTrack } from "@/schemas";
import { Badge } from "@/ui";

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

/** A member's onboarding steps for a project — the quizzes that gate full access. */
export function MemberOnboardingSteps({ tracks }: { tracks: ProjectTrack[] }) {
  if (tracks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This project has no onboarding steps yet — you already have access.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <TrackRow key={track.id} track={track} />
      ))}
    </div>
  );
}
