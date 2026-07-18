"use client";

import { useUser } from "@clerk/nextjs";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FolderKanbanIcon,
  GitBranchIcon,
  LifeBuoyIcon,
  LockIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { EmployeePackList } from "@/components/doc-pack";
import { projectSectionPath } from "@/components/layout";
import { ReadinessBadge, ReadinessBar } from "@/components/project";
import { EmptyState, QueryState } from "@/components/shared";
import { useMe } from "@/hooks/queries/me";
import { useEmployeeAssignments } from "@/hooks/queries/pack-assignment";
import { useMyProjects } from "@/hooks/queries/project";
import { appPath } from "@/lib";
import type { PackAssignment, PackAssignmentStatus } from "@/schemas";
import { Button, Card, CardContent, Skeleton } from "@/ui";
import { firstNameOf, HomeGreeting, SectionHeader } from "./home-primitives";

/** Which assignment to surface as the single "next step". Continue in-flight work first. */
const NEXT_STEP_PRIORITY: PackAssignmentStatus[] = [
  "quiz_in_progress",
  "reading",
  "ready_for_quiz",
  "assigned",
  "failed",
];

function nextStepLabel(status: PackAssignmentStatus): string {
  switch (status) {
    case "quiz_in_progress":
      return "Resume your quiz";
    case "reading":
      return "Keep reading";
    case "ready_for_quiz":
      return "Take the quiz";
    case "assigned":
      return "Start";
    case "failed":
      return "Retry the quiz";
    default:
      return "Continue";
  }
}

function pickNextStep(assignments: PackAssignment[]): PackAssignment | null {
  for (const status of NEXT_STEP_PRIORITY) {
    const match = assignments
      .filter((a) => a.status === status)
      .sort((a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime())[0];
    if (match) return match;
  }
  return null;
}

function NextStepCard({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeAssignments(employeeId, { enabled: Boolean(employeeId) });
  const assignments = data ?? [];
  const next = useMemo(() => pickNextStep(assignments), [assignments]);
  const allDone = assignments.length > 0 && !next;

  if (!employeeId || isLoading) {
    return <Skeleton className="h-32 w-full rounded-2xl" />;
  }

  // Nothing assigned yet — reassure, don't alarm.
  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={SparklesIcon}
        tone="mist"
        title="You're all set for now"
        description="Nothing is assigned to you yet. New onboarding appears here and on the bell up top."
      />
    );
  }

  if (allDone) {
    return (
      <EmptyState
        icon={CheckCircle2Icon}
        tone="moss"
        title="You're all caught up"
        description="Every module you've been assigned is complete. Nice work."
      />
    );
  }

  if (!next) return null;
  const title = next.docPackName ?? "your module";

  return (
    <Card className="overflow-hidden border-brand-honey/30 shadow-soft">
      <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-amber">
            Your next step
          </p>
          <p className="text-lg font-semibold leading-tight text-balance">
            {nextStepLabel(next.status)} — {title}
          </p>
          <p className="text-sm text-muted-foreground">
            One step at a time. You can stop and pick up where you left off whenever you need to.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href={`/app/onboarding/packs/${next.id}`}>
            {nextStepLabel(next.status)}
            <ArrowRightIcon />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MyTeamsSection() {
  const { data: projects, isLoading, isError, error } = useMyProjects();

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Your teams"
        hint="Projects you're part of"
        action={{ label: "View all", href: appPath("projects") }}
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!!projects && projects.length === 0}
        loading={<Skeleton className="h-28 w-full rounded-xl" />}
        empty={
          <EmptyState
            icon={FolderKanbanIcon}
            tone="mist"
            title="You're not on any teams yet"
            description="Someone will add you to one soon."
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(projects ?? []).slice(0, 4).map((project) => (
            <Link key={project.id} href={appPath("projects", project.id)} className="group">
              <Card className="h-full transition-shadow duration-200 group-hover:shadow-soft">
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {project.readiness.locked && (
                        <LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <p className="truncate text-sm font-semibold leading-tight">{project.name}</p>
                    </div>
                    <ReadinessBadge readiness={project.readiness} />
                  </div>
                  <ReadinessBar readiness={project.readiness} />
                  {project.repoName && (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranchIcon className="size-3.5" /> {project.repoName}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </QueryState>
    </section>
  );
}

/** Where to send a stuck employee for help — their first project's "who to ask", if any. */
function HelpCard() {
  const { data: projects } = useMyProjects();
  const firstProject = projects?.[0];
  const askHref = firstProject
    ? projectSectionPath(firstProject.id, "experts")
    : appPath("projects");

  return (
    <Card className="border-brand-teal/25 bg-accent/40">
      <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal-soft text-brand-teal">
            <LifeBuoyIcon className="size-5" />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">Stuck on something?</p>
            <p className="max-w-md text-sm text-muted-foreground">
              You never have to guess who to ask. We&apos;ll point you to the right person — with
              the context — so you can keep moving.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={askHref}>
              <LifeBuoyIcon /> Who to ask
            </Link>
          </Button>
          {firstProject && (
            <Button asChild variant="secondary" size="sm">
              <Link href={projectSectionPath(firstProject.id, "ask")}>
                <SparklesIcon /> Ask a question
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MemberHome() {
  const { user } = useUser();
  const { data: me } = useMe();
  const employeeId = me?.employeeId ?? "";
  const name = firstNameOf(user?.firstName ?? user?.fullName);

  return (
    <div className="space-y-8">
      <HomeGreeting name={name} line="Here's what's next for you. No rush — one step at a time." />

      <NextStepCard employeeId={employeeId} />

      <section className="space-y-3">
        <SectionHeader
          title="Your onboarding"
          hint="Everything assigned to you and how far along"
        />
        <EmployeePackList />
      </section>

      <MyTeamsSection />

      <HelpCard />
    </div>
  );
}
