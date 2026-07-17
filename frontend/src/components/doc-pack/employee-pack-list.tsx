"use client";

import { AlarmClockIcon, ClockIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { useMe } from "@/hooks/queries/me/me.queries";
import { useEmployeeAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { cn } from "@/lib/utils";
import type { PackAssignment } from "@/schemas/packAssignment.schema";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

function formatDue(dueAt: string | null): string {
  const date = new Date(dueAt ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(dueAt: string | null, status: PackAssignment["status"]): boolean {
  if (!dueAt || status === "passed") return false;
  const date = new Date(dueAt);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function TestsLeftBadge({ testsLeft }: { testsLeft: number }) {
  return (
    <Badge variant={testsLeft > 0 ? "secondary" : "default"}>
      {testsLeft > 0 ? `${testsLeft} left` : "All cleared"}
    </Badge>
  );
}

function ctaLabel(status: PackAssignment["status"]): string {
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

function AssignmentList({ assignments }: { assignments: PackAssignment[] }) {
  if (assignments.length === 0) {
    return <p className="text-sm text-muted-foreground">No tracks assigned yet.</p>;
  }

  const sorted = [...assignments].sort((a, b) => {
    const aDone = a.status === "passed" ? 1 : 0;
    const bDone = b.status === "passed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (a.status === "assigned" && b.status !== "assigned") return -1;
    if (b.status === "assigned" && a.status !== "assigned") return 1;
    return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
  });

  return (
    <ul className="space-y-2">
      {sorted.map((assignment) => {
        const isNew = assignment.status === "assigned";
        const overdue = isOverdue(assignment.dueAt, assignment.status);
        const due = formatDue(assignment.dueAt);
        return (
          <li key={assignment.id}>
            <Link
              href={`/app/onboarding/packs/${assignment.id}`}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-soft",
                isNew
                  ? "border-brand-honey/40 bg-brand-honey-soft/40"
                  : "border-border bg-background",
              )}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{assignment.docPackName ?? "Track"}</span>
                  {isNew && (
                    <Badge variant="warning" className="h-5 shrink-0 px-1.5 text-[0.65rem]">
                      New
                    </Badge>
                  )}
                  {assignment.locked && (
                    <Badge variant="secondary" className="h-5 shrink-0 gap-1 px-1.5">
                      <LockIcon className="size-3" /> Locked
                    </Badge>
                  )}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>Assigned {new Date(assignment.assignedAt).toLocaleDateString()}</span>
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
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={assignmentStatusVariant(assignment.status)}>
                  {ASSIGNMENT_STATUS_LABEL[assignment.status]}
                </Badge>
                <span className="hidden text-xs font-semibold text-brand-teal sm:inline">
                  {ctaLabel(assignment.status)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Employee "tracks left" list (Doc Pack PRD §7). Identity is always the signed-in
 * member's own employee row, resolved server-side from the Clerk session — there is
 * deliberately no admin "view as" override here (that would be impersonation).
 */
export function EmployeePackList() {
  const meQuery = useMe();
  const employeeId = meQuery.data?.employeeId ?? "";
  const assignmentsQuery = useEmployeeAssignments(employeeId);

  const assignments = assignmentsQuery.data ?? [];
  const testsLeft = assignments.filter((a) => a.status !== "passed").length;

  const ready = Boolean(employeeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Your tracks
          {ready && !assignmentsQuery.isLoading && <TestsLeftBadge testsLeft={testsLeft} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!ready || assignmentsQuery.isLoading) && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {ready && assignmentsQuery.isError && (
          <p className="text-sm text-muted-foreground">Could not load your tracks.</p>
        )}

        {ready && !assignmentsQuery.isLoading && !assignmentsQuery.isError && (
          <AssignmentList assignments={assignments} />
        )}
      </CardContent>
    </Card>
  );
}
