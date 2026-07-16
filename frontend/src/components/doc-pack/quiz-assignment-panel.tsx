"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  Loader2Icon,
  UserPlusIcon,
} from "lucide-react";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import { useDocPackQuiz } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { usePackAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import {
  useCreateAssignments,
  useRevokeAssignment,
} from "@/hooks/queries/pack-assignment/pack-assignment.mutations";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/doc-pack/doc-pack-assignments";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DocPackListItem } from "@/schemas/docPack.schema";
import type { PackAssignmentStatus } from "@/schemas/packAssignment.schema";
import { getApiErrorMessage } from "@/lib/api/errors";

const PROGRESS_STRIP: { status: PackAssignmentStatus; tone: string }[] = [
  { status: "assigned", tone: "bg-muted text-muted-foreground" },
  { status: "reading", tone: "bg-brand-info/10 text-brand-info" },
  { status: "ready_for_quiz", tone: "bg-accent text-accent-foreground" },
  { status: "quiz_in_progress", tone: "bg-warning/10 text-warning" },
  { status: "passed", tone: "bg-brand-moss-soft text-brand-moss" },
  { status: "failed", tone: "bg-brand-coral-soft text-brand-coral" },
];

/** Assign + roster for one quiz — used inside the Assign sheet on the Quizzes desk. */
export function QuizAssignmentPanel({ pack }: { pack: DocPackListItem }) {
  return <QuizAssignmentPanelLoaded key={pack.id} pack={pack} />;
}

function QuizAssignmentPanelLoaded({ pack }: { pack: DocPackListItem }) {
  const employeesQuery = useEmployees();
  const assignmentsQuery = usePackAssignments(pack.id);
  const quizQuery = useDocPackQuiz(pack.id);
  const createAssignments = useCreateAssignments(pack.id);
  const revoke = useRevokeAssignment(pack.id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const quizPublished = Boolean(quizQuery.data?.isPublished);
  const quizLoading = quizQuery.isLoading;
  const assignments = assignmentsQuery.data ?? [];
  const assignedEmployeeIds = new Set(assignments.map((a) => a.employeeId));
  const employeeById = new Map((employeesQuery.data ?? []).map((e) => [e.id, e]));
  const assignableEmployees = (employeesQuery.data ?? []).filter(
    (e) => !assignedEmployeeIds.has(e.id),
  );

  const statusCounts = useMemo(() => {
    const list = assignmentsQuery.data ?? [];
    const counts: Partial<Record<PackAssignmentStatus, number>> = {};
    for (const a of list) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return counts;
  }, [assignmentsQuery.data]);

  function toggleEmployee(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleAssign() {
    if (selectedIds.length === 0) return;
    createAssignments.mutate(selectedIds, { onSuccess: () => setSelectedIds([]) });
  }

  const isLoading = employeesQuery.isLoading || assignmentsQuery.isLoading || quizLoading;
  const isError = employeesQuery.isError || assignmentsQuery.isError;

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
        <div className="rounded-xl border border-border bg-brand-mist/60 px-4 py-4">
          <p className="text-sm font-medium">Quiz not published yet</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Finish and publish the quiz before assigning it to hires.
          </p>
          <Button className="mt-3" size="sm" asChild>
            <Link href={`/doc-packs/${pack.id}`}>Open quiz builder</Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && quizPublished && (
        <>
          <section className="space-y-3" aria-labelledby="assign-heading">
            <h3 id="assign-heading" className="text-sm font-semibold">
              Choose people
            </h3>

            {assignableEmployees.length === 0 && assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No organization members found. Invite people in Clerk (Organization
                switcher → Members), then reopen Assign — members sync automatically.
              </p>
            )}

            {assignableEmployees.length === 0 && assignments.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Everyone in the org is already assigned to this quiz.
              </p>
            )}

            {assignableEmployees.length > 0 && (
              <div className="space-y-3">
                <ul className="flex flex-wrap gap-2">
                  {assignableEmployees.map((employee) => {
                    const selected = selectedIds.includes(employee.id);
                    return (
                      <li key={employee.id}>
                        <Button
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          onClick={() => toggleEmployee(employee.id)}
                          aria-pressed={selected}
                        >
                          {selected && <CheckIcon className="size-3.5" />}
                          {employee.name}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedIds.length === 0 || createAssignments.isPending}
                  onClick={handleAssign}
                >
                  {createAssignments.isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <UserPlusIcon className="size-4" />
                  )}
                  Assign{selectedIds.length > 0 ? ` ${selectedIds.length}` : ""} selected
                </Button>
                {createAssignments.isError && (
                  <p className="text-sm text-destructive">
                    {getApiErrorMessage(createAssignments.error, "Assigning failed.")}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="roster-heading">
            <h3 id="roster-heading" className="text-sm font-semibold">
              Who has this quiz
            </h3>

            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No one is assigned yet. Select people above.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {employeeById.get(assignment.employeeId)?.name ??
                          assignment.employeeId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={assignmentStatusVariant(assignment.status)}>
                        {ASSIGNMENT_STATUS_LABEL[assignment.status]}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(assignment.status === "passed" && "invisible")}
                        disabled={revoke.isPending}
                        onClick={() => revoke.mutate(assignment.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {revoke.isError && (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(revoke.error, "Revoke failed.")}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
