"use client";

import { BookOpen, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ASSIGNMENT_STATUS_LABEL, assignmentStatusVariant } from "@/components/shared";
import { useMe } from "@/hooks/queries/me";
import { useEmployeeAssignments } from "@/hooks/queries/pack-assignment";
import { cn, getSeenAssignmentIds, markAssignmentsSeen, seedSeenAssignmentsIfEmpty } from "@/lib";
import type { PackAssignment, PackAssignmentStatus } from "@/schemas";
import { Badge, Button, Popover, PopoverContent, PopoverTrigger, Skeleton } from "@/ui";

const ACTIONABLE: PackAssignmentStatus[] = [
  "assigned",
  "reading",
  "ready_for_quiz",
  "quiz_in_progress",
  "failed",
];

function isActionable(status: PackAssignmentStatus) {
  return ACTIONABLE.includes(status);
}

function sortActionable(assignments: PackAssignment[]) {
  return [...assignments]
    .filter((a) => isActionable(a.status))
    .sort((a, b) => {
      const aNew = a.status === "assigned" ? 0 : 1;
      const bNew = b.status === "assigned" ? 0 : 1;
      if (aNew !== bNew) return aNew - bNew;
      return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
    });
}

function statusHint(status: PackAssignmentStatus): string {
  switch (status) {
    case "assigned":
      return "New module — start reading";
    case "reading":
      return "Keep reading to unlock the quiz";
    case "ready_for_quiz":
      return "Ready — take the quiz";
    case "quiz_in_progress":
      return "Quiz in progress — finish when ready";
    case "failed":
      return "Retry the quiz to complete this module";
    default:
      return ASSIGNMENT_STATUS_LABEL[status];
  }
}

function AssignmentRow({
  assignment,
  isNew,
  onNavigate,
}: {
  assignment: PackAssignment;
  isNew: boolean;
  onNavigate: () => void;
}) {
  const title = assignment.docPackName ?? "Module";
  const Icon = assignment.status === "ready_for_quiz" ? ClipboardCheck : BookOpen;

  return (
    <li>
      <Link
        href={`/app/onboarding/packs/${assignment.id}`}
        onClick={onNavigate}
        className={cn(
          "flex gap-3 rounded-lg px-3 py-2.5 transition-[background-color,transform] duration-200",
          "hover:bg-muted active:scale-[0.99]",
          isNew && "bg-brand-honey-soft/50",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            isNew ? "bg-brand-honey-soft text-brand-amber" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{title}</span>
            {isNew && (
              <Badge variant="warning" className="h-5 shrink-0 px-1.5 text-[0.65rem]">
                New
              </Badge>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">
            {statusHint(assignment.status)}
          </span>
          <span className="mt-1.5 inline-flex">
            <Badge
              variant={assignmentStatusVariant(assignment.status)}
              className="h-5 text-[0.65rem]"
            >
              {ASSIGNMENT_STATUS_LABEL[assignment.status]}
            </Badge>
          </span>
        </span>
      </Link>
    </li>
  );
}

function NotificationsBody({
  employeeId,
  isLoading,
  isError,
  actionable,
  newIds,
  newCount,
  onClose,
}: {
  employeeId: string;
  isLoading: boolean;
  isError: boolean;
  actionable: PackAssignment[];
  newIds: Set<string>;
  newCount: number;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-2.5">
        <div>
          <p className="text-sm font-semibold text-balance">Your modules</p>
          <p className="text-xs text-muted-foreground">
            {actionable.length === 0
              ? "You're all caught up"
              : `${actionable.length} open · ${newCount} new`}
          </p>
        </div>
        <Link
          href="/app/onboarding/packs"
          onClick={onClose}
          className="text-xs font-medium text-brand-teal transition-colors hover:text-brand-teal/80"
        >
          View all
        </Link>
      </div>

      {(!employeeId || isLoading) && (
        <div className="space-y-2 p-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      )}

      {employeeId && isError && (
        <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">
          Could not load assignments.
        </p>
      )}

      {employeeId && !isLoading && !isError && actionable.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-3.5 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-moss-soft text-brand-moss">
            <ClipboardCheck className="size-4" />
          </span>
          <p className="text-sm font-medium">No open modules</p>
          <p className="text-xs text-pretty text-muted-foreground">
            When a module is assigned to you, it shows up here.
          </p>
        </div>
      )}

      {employeeId && !isLoading && !isError && actionable.length > 0 && (
        <ul className="max-h-80 space-y-0.5 overflow-y-auto p-1.5">
          {actionable.map((assignment) => (
            <AssignmentRow
              key={assignment.id}
              assignment={assignment}
              isNew={newIds.has(assignment.id)}
              onNavigate={onClose}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Topbar inbox for the signed-in employee: polls pack assignments and surfaces
 * newly assigned quizzes with a badge until the panel is opened (Doc Pack PRD §10 #11).
 */
export function AssignmentNotifications() {
  const meQuery = useMe();
  const employeeId = meQuery.data?.employeeId ?? "";
  const isAdmin = meQuery.data?.appRole === "admin";
  const assignmentsQuery = useEmployeeAssignments(employeeId, {
    refetchInterval: 45_000,
    enabled: !!employeeId && !isAdmin,
  });
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  const assignments = assignmentsQuery.data ?? [];
  const actionable = useMemo(() => sortActionable(assignments), [assignments]);

  useEffect(() => {
    if (!employeeId || !assignmentsQuery.isSuccess) return;
    seedSeenAssignmentsIfEmpty(
      employeeId,
      assignments.map((a) => ({ id: a.id, status: a.status })),
    );
    setSeenIds(getSeenAssignmentIds(employeeId));
    setHydrated(true);
  }, [employeeId, assignmentsQuery.isSuccess, assignments]);

  const newIds = useMemo(() => {
    if (!hydrated) return new Set<string>();
    return new Set(actionable.filter((a) => !seenIds.has(a.id)).map((a) => a.id));
  }, [actionable, seenIds, hydrated]);

  const newCount = newIds.size;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && employeeId) {
      markAssignmentsSeen(
        employeeId,
        actionable.map((a) => a.id),
      );
      setSeenIds(getSeenAssignmentIds(employeeId));
    }
  }

  if (isAdmin || (!employeeId && !meQuery.isLoading)) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            newCount > 0
              ? `${newCount} new module assignment${newCount === 1 ? "" : "s"}`
              : "Module assignments"
          }
        >
          <ClipboardCheck className="size-4" />
          {newCount > 0 && (
            <span
              className={cn(
                "absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full",
                "bg-brand-coral px-1 text-[0.625rem] font-semibold leading-none text-white tabular-nums",
                "shadow-[0_0_0_2px_var(--background)]",
              )}
              aria-hidden
            >
              {newCount > 9 ? "9+" : newCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <NotificationsBody
          employeeId={employeeId}
          isLoading={assignmentsQuery.isLoading}
          isError={assignmentsQuery.isError}
          actionable={actionable}
          newIds={newIds}
          newCount={newCount}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
