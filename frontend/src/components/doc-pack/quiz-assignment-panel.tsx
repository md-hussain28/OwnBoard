"use client";

import { FileLockIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ASSIGNMENT_STATUS_LABEL, AssignmentRoster, EmptyState } from "@/components/shared";
import { useDocPackQuiz } from "@/hooks/queries/doc-pack";
import { usePackAssignments } from "@/hooks/queries/pack-assignment";
import { cn } from "@/lib";
import type { DocPackListItem, PackAssignmentStatus } from "@/schemas";
import { Button, Skeleton } from "@/ui";

const PROGRESS_STRIP: { status: PackAssignmentStatus; tone: string }[] = [
  { status: "assigned", tone: "bg-muted text-muted-foreground" },
  { status: "reading", tone: "bg-brand-info/10 text-brand-info" },
  { status: "ready_for_quiz", tone: "bg-accent text-accent-foreground" },
  { status: "quiz_in_progress", tone: "bg-warning/10 text-warning" },
  { status: "passed", tone: "bg-brand-moss-soft text-brand-moss" },
  { status: "failed", tone: "bg-brand-coral-soft text-brand-coral" },
];

/** Assign + roster for one quiz — used inside the Assign modal on the Tracks desk. */
export function QuizAssignmentPanel({ pack }: { pack: DocPackListItem }) {
  return <QuizAssignmentPanelLoaded key={pack.id} pack={pack} />;
}

function QuizAssignmentPanelLoaded({ pack }: { pack: DocPackListItem }) {
  const assignmentsQuery = usePackAssignments(pack.id);
  const quizQuery = useDocPackQuiz(pack.id);

  const quizPublished = Boolean(quizQuery.data?.isPublished);
  const quizLoading = quizQuery.isLoading;
  const assignments = assignmentsQuery.data ?? [];

  const statusCounts = useMemo(() => {
    const list = assignmentsQuery.data ?? [];
    const counts: Partial<Record<PackAssignmentStatus, number>> = {};
    for (const a of list) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return counts;
  }, [assignmentsQuery.data]);

  const isLoading = assignmentsQuery.isLoading || quizLoading;
  const isError = assignmentsQuery.isError;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-1 pb-2">
      {!isLoading && !isError && assignments.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Assignment progress">
          {PROGRESS_STRIP.map(({ status, tone }) => {
            const count = statusCounts[status] ?? 0;
            if (count === 0) return null;
            return (
              <li
                key={status}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                  tone,
                )}
              >
                <span className="tabular-nums">{count}</span>
                {ASSIGNMENT_STATUS_LABEL[status]}
              </li>
            );
          })}
        </ul>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Could not load employees or assignments. Start the FastAPI service and refresh.
        </p>
      )}

      {!isLoading && !isError && !quizPublished && (
        <EmptyState
          icon={FileLockIcon}
          tone="honey"
          title="Quiz not published yet"
          description="Finish and publish the quiz before assigning it to hires."
          action={
            <Button size="sm" asChild>
              <Link href={`/app/tracks/${pack.id}`}>Open quiz builder</Link>
            </Button>
          }
        />
      )}

      {!isLoading && !isError && quizPublished && (
        <AssignmentRoster
          packId={pack.id}
          quizPublished={quizPublished}
          chooseHeading="Choose people"
          rosterHeading="Who has this module"
          emptyRosterHint="No one is assigned yet. Select people above."
          emptyOrgHint={
            <>
              No organization members found. Invite people from{" "}
              <Link href="/app/team" className="underline underline-offset-2">
                Team
              </Link>
              , then reopen Assign — members sync automatically.
            </>
          }
        />
      )}
    </div>
  );
}
