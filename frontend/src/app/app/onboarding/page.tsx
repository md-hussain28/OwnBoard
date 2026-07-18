"use client";

import {
  AlarmClockIcon,
  ArrowRightIcon,
  BookOpenCheckIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  Code2Icon,
  LockIcon,
  UnlockIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { IncomingBadge } from "@/components/layout/incoming-feature";
import { MemberOnlyGate } from "@/components/onboarding/member-only-gate";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { useMe } from "@/hooks/queries/me/me.queries";
import { useEmployeeAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { cn } from "@/lib/utils";
import type { PackAssignment, PackAssignmentStatus } from "@/schemas/packAssignment.schema";
import {
  type OnboardingStep,
  type StepResult,
  useOnboardingStore,
} from "@/stores/onboarding-store";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Progress } from "@/ui/progress";
import { Skeleton } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

/* ------------------------------------------------------------------ */
/* Reading tracks — the real, live assignments, shown in a fixed order */
/* ------------------------------------------------------------------ */

function trackCtaLabel(status: PackAssignmentStatus): string {
  switch (status) {
    case "assigned":
      return "Start";
    case "reading":
      return "Continue";
    case "ready_for_quiz":
      return "Take quiz";
    case "quiz_in_progress":
      return "Resume";
    case "failed":
      return "Retry";
    case "passed":
      return "Review";
    default:
      return "Open";
  }
}

function formatDue(dueAt: string | null | undefined): string {
  const date = new Date(dueAt ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(dueAt: string | null | undefined, status: PackAssignmentStatus): boolean {
  if (!dueAt || status === "passed") return false;
  const date = new Date(dueAt);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function TrackMeta({ assignment }: { assignment: PackAssignment }) {
  const overdue = isOverdue(assignment.dueAt, assignment.status);
  const due = formatDue(assignment.dueAt);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      <span className="tabular-nums">
        Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
      </span>
      {due && (
        <span
          className={cn(
            "inline-flex items-center gap-1 tabular-nums",
            overdue && "font-medium text-brand-coral",
          )}
        >
          <AlarmClockIcon className="size-3" />
          {overdue ? "Overdue" : `Due ${due}`}
        </span>
      )}
      {assignment.estimatedMinutes != null && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <ClockIcon className="size-3" />~{assignment.estimatedMinutes} min
        </span>
      )}
    </div>
  );
}

function TrackMarker({
  done,
  locked,
  isNext,
  index,
  showConnector,
}: {
  done: boolean;
  locked: boolean;
  isNext: boolean;
  index: number;
  showConnector: boolean;
}) {
  let content: ReactNode = index + 1;
  if (done) content = <CheckCircle2Icon className="size-4" />;
  else if (locked) content = <LockIcon className="size-3.5" />;

  return (
    <div className="flex flex-col items-center pt-0.5" aria-hidden>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
          done && "bg-success/15 text-success",
          isNext && !done && "bg-primary text-primary-foreground",
          !done && !isNext && "bg-muted text-muted-foreground",
        )}
      >
        {content}
      </span>
      {showConnector && (
        <span className={cn("mt-2 min-h-4 w-px flex-1", done ? "bg-success/40" : "bg-border")} />
      )}
    </div>
  );
}

function TrackLockBadge({ lockedByName }: { lockedByName: string | null }) {
  const hint = lockedByName ? `Finish "${lockedByName}" first` : "Finish the earlier module first";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default items-center" aria-label={hint}>
          <Badge variant="secondary" className="gap-1">
            <LockIcon className="size-3" /> Locked
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

function TrackCta({
  assignment,
  locked,
  primary,
}: {
  assignment: PackAssignment;
  locked: boolean;
  primary: boolean;
}) {
  if (locked) {
    return (
      <Button size="sm" variant="outline" disabled className="shrink-0 self-start sm:self-center">
        <LockIcon className="size-3.5" /> Locked
      </Button>
    );
  }
  return (
    <Button
      asChild
      size="sm"
      variant={primary ? "default" : "outline"}
      className="shrink-0 self-start sm:self-center"
    >
      <Link href={`/app/onboarding/packs/${assignment.id}`}>
        {trackCtaLabel(assignment.status)}
      </Link>
    </Button>
  );
}

function TrackRow({
  assignment,
  index,
  isNext,
  showConnector,
}: {
  assignment: PackAssignment;
  index: number;
  isNext: boolean;
  showConnector: boolean;
}) {
  const done = assignment.status === "passed";
  const locked = assignment.locked && !done;
  const primary = isNext && !done;

  return (
    <li
      className={cn(
        "relative flex gap-4 p-4 transition-colors",
        isNext && "bg-primary/5",
        locked && "opacity-70",
        showConnector && "border-b",
      )}
    >
      <TrackMarker
        done={done}
        locked={locked}
        isNext={isNext}
        index={index}
        showConnector={showConnector}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              Module {index + 1}
            </span>
            <Badge variant={primary ? "default" : assignmentStatusVariant(assignment.status)}>
              {primary ? "Up next" : ASSIGNMENT_STATUS_LABEL[assignment.status]}
            </Badge>
            {locked && <TrackLockBadge lockedByName={assignment.lockedByName} />}
          </div>
          <p className="truncate font-medium text-foreground">
            {assignment.docPackName ?? "Module"}
          </p>
          <TrackMeta assignment={assignment} />
        </div>
        <TrackCta assignment={assignment} locked={locked} primary={primary} />
      </div>
    </li>
  );
}

function TracksBody({
  loading,
  isError,
  ordered,
  nextId,
}: {
  loading: boolean;
  isError: boolean;
  ordered: PackAssignment[];
  nextId: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-4 shadow-soft">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-soft">
        Could not load your modules. Start the FastAPI service and refresh.
      </div>
    );
  }

  if (ordered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        No modules assigned yet. New assignments show up here and on the bell in the top right.
      </div>
    );
  }

  return (
    <>
      <ol className="overflow-hidden rounded-xl border bg-card shadow-soft">
        {ordered.map((assignment, index) => (
          <TrackRow
            key={assignment.id}
            assignment={assignment}
            index={index}
            isNext={assignment.id === nextId}
            showConnector={index < ordered.length - 1}
          />
        ))}
      </ol>
      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href="/app/onboarding/packs">
            View all modules
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </Button>
      </div>
    </>
  );
}

function NextTrackHero({ assignment }: { assignment: PackAssignment }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-brand-honey/40 bg-brand-honey-soft/40 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Up next</Badge>
          <Badge variant={assignmentStatusVariant(assignment.status)}>
            {ASSIGNMENT_STATUS_LABEL[assignment.status]}
          </Badge>
        </div>
        <p className="truncate text-lg font-semibold text-balance text-foreground">
          {assignment.docPackName ?? "Module"}
        </p>
        <TrackMeta assignment={assignment} />
      </div>
      <Button asChild size="lg" className="shrink-0 self-start sm:self-center">
        <Link href={`/app/onboarding/packs/${assignment.id}`}>
          {trackCtaLabel(assignment.status)}
          <ArrowRightIcon className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function ReadingTracksSection() {
  const meQuery = useMe();
  const employeeId = meQuery.data?.employeeId ?? "";
  const assignmentsQuery = useEmployeeAssignments(employeeId);

  const ready = Boolean(employeeId);
  const loading = !ready || meQuery.isLoading || assignmentsQuery.isLoading;

  // Fixed, stable sequence: the order tracks were assigned. Progress flows
  // top-to-bottom as each one is completed — no reshuffling under the user.
  const ordered = [...(assignmentsQuery.data ?? [])].sort(
    (a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime(),
  );
  // The one actionable track: earliest that is neither passed nor locked.
  const nextActionable = ordered.find((a) => a.status !== "passed" && !a.locked) ?? null;
  const nextId = nextActionable?.id ?? null;
  const passedCount = ordered.filter((a) => a.status === "passed").length;
  const total = ordered.length;
  const progressPct = total > 0 ? Math.round((passedCount / total) * 100) : 0;

  return (
    <section className="space-y-3" aria-labelledby="tracks-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="tracks-heading" className="text-sm font-medium text-muted-foreground">
          Reading modules
        </h2>
        {!loading && total > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground">
              {passedCount} of {total} modules complete
            </span>{" "}
            ({progressPct}%)
          </span>
        )}
      </div>

      {!loading && total > 0 && (
        <Progress value={progressPct} aria-label={`${progressPct}% of modules complete`} />
      )}

      {!loading && nextActionable && <NextTrackHero assignment={nextActionable} />}

      <TracksBody
        loading={loading}
        isError={assignmentsQuery.isError}
        ordered={ordered}
        nextId={nextId}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Access gate — policy + codebase quizzes (backend still incoming)    */
/* ------------------------------------------------------------------ */

type QuizAssignment = {
  key: Exclude<OnboardingStep, "unlocked">;
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const QUIZ_ASSIGNMENTS: QuizAssignment[] = [
  {
    key: "policy-quiz",
    label: "Policy quiz",
    description: "Open-book check on company policy. Pass this before the codebase quiz.",
    href: "/app/onboarding/policy-quiz",
    icon: <BookOpenCheckIcon className="size-4" />,
  },
  {
    key: "codebase-quiz",
    label: "Codebase quiz",
    description: "Scenario questions grounded in your team's real git history.",
    href: "/app/onboarding/codebase-quiz",
    icon: <Code2Icon className="size-4" />,
  },
];

function resultLabel(result: StepResult, isCurrent: boolean): string {
  if (result === "passed") return "Passed";
  if (result === "failed") return "Failed — retry";
  if (isCurrent) return "Up next";
  return "Not started";
}

function resultVariant(
  result: StepResult,
  isCurrent: boolean,
): "success" | "destructive" | "default" | "secondary" {
  if (result === "passed") return "success";
  if (result === "failed") return "destructive";
  if (isCurrent) return "default";
  return "secondary";
}

function ctaLabel(result: StepResult, isCurrent: boolean): string {
  if (result === "passed") return "Review";
  if (result === "failed") return "Retry";
  if (isCurrent) return "Start quiz";
  return "Open";
}

function StepMarker({
  isPassed,
  isCurrent,
  icon,
}: {
  isPassed: boolean;
  isCurrent: boolean;
  icon: ReactNode;
}) {
  if (isPassed) return <CheckCircle2Icon className="size-4" />;
  if (isCurrent) return icon;
  return <CircleIcon className="size-3.5" />;
}

function QuizAssignmentRow({
  quiz,
  index,
  result,
  isCurrent,
  showConnector,
}: {
  quiz: QuizAssignment;
  index: number;
  result: StepResult;
  isCurrent: boolean;
  showConnector: boolean;
}) {
  const isPassed = result === "passed";

  return (
    <li
      className={cn(
        "relative flex gap-4 p-4 transition-colors",
        isCurrent && "bg-primary/5",
        showConnector && "border-b",
      )}
    >
      <div className="flex flex-col items-center pt-0.5" aria-hidden>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            isPassed && "bg-success/15 text-success",
            isCurrent && !isPassed && "bg-primary text-primary-foreground",
            !isCurrent && !isPassed && "bg-muted text-muted-foreground",
          )}
        >
          <StepMarker isPassed={isPassed} isCurrent={isCurrent} icon={quiz.icon} />
        </span>
        {showConnector && (
          <span
            className={cn("mt-2 min-h-4 w-px flex-1", isPassed ? "bg-success/40" : "bg-border")}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              Quiz {index + 1}
            </span>
            <Badge variant={resultVariant(result, isCurrent)}>
              {resultLabel(result, isCurrent)}
            </Badge>
          </div>
          <p className="font-medium text-foreground">{quiz.label}</p>
          <p className="text-pretty text-sm text-muted-foreground">{quiz.description}</p>
        </div>
        <Button
          asChild
          size="sm"
          variant={isCurrent && !isPassed ? "default" : "outline"}
          className="shrink-0 self-start sm:self-center"
        >
          <Link href={quiz.href}>{ctaLabel(result, isCurrent)}</Link>
        </Button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const { currentStep, policyQuizResult, codebaseQuizResult } = useOnboardingStore();
  const results: Record<Exclude<OnboardingStep, "unlocked">, StepResult> = {
    "policy-quiz": policyQuizResult,
    "codebase-quiz": codebaseQuizResult,
  };

  const quizzesPassed =
    (policyQuizResult === "passed" ? 1 : 0) + (codebaseQuizResult === "passed" ? 1 : 0);
  const unlocked = currentStep === "unlocked" && quizzesPassed === 2;

  return (
    <MemberOnlyGate>
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Your onboarding</h1>
          <p className="max-w-prose text-pretty text-muted-foreground">
            Everything your admin assigned, in the order to work through it. Finish your reading
            modules and gate quizzes to unlock repo access.
          </p>
        </header>

        <ReadingTracksSection />

        <section className="space-y-3" aria-labelledby="gate-heading">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="gate-heading" className="text-sm font-medium text-muted-foreground">
              Access gate — complete in order
            </h2>
            <IncomingBadge />
          </div>

          <ol className="overflow-hidden rounded-xl border bg-card shadow-soft">
            {QUIZ_ASSIGNMENTS.map((quiz, index) => (
              <QuizAssignmentRow
                key={quiz.key}
                quiz={quiz}
                index={index}
                result={results[quiz.key]}
                isCurrent={quiz.key === currentStep}
                showConnector={index < QUIZ_ASSIGNMENTS.length - 1}
              />
            ))}
          </ol>
        </section>

        <section
          className={cn(
            "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
            unlocked ? "border-success/30 bg-success/5" : "border-dashed bg-muted/30",
          )}
          aria-labelledby="unlock-heading"
        >
          <div className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                unlocked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
              )}
              aria-hidden
            >
              {unlocked ? <UnlockIcon className="size-4" /> : <LockIcon className="size-4" />}
            </span>
            <div className="space-y-1">
              <h2 id="unlock-heading" className="font-medium text-foreground">
                {unlocked ? "Repo access unlocked" : "Repo access locked"}
              </h2>
              <p className="text-pretty text-sm text-muted-foreground">
                {unlocked
                  ? "Both gate quizzes are complete. You can use the archaeology Q&A and related tools."
                  : "Pass the policy quiz, then the codebase quiz, to unlock access."}
              </p>
            </div>
          </div>
          {unlocked ? (
            <Button asChild size="sm" className="shrink-0 self-start sm:self-center">
              <Link href="/app/onboarding/unlocked">Open</Link>
            </Button>
          ) : (
            <Badge variant="secondary" className="shrink-0 self-start sm:self-center">
              After quizzes
            </Badge>
          )}
        </section>
      </div>
    </MemberOnlyGate>
  );
}
