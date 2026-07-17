"use client";

import { CheckIcon, Loader2Icon, UserPlusIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import {
  useCreateAssignments,
  useRevokeAssignment,
} from "@/hooks/queries/pack-assignment/pack-assignment.mutations";
import { usePackAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { Employee } from "@/schemas/employee.schema";
import type { PackAssignment } from "@/schemas/packAssignment.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";

type AssignmentRosterProps = {
  packId: string;
  quizPublished: boolean;
  emptyOrgHint?: ReactNode;
  emptyRosterHint?: string;
  chooseHeading?: string;
  rosterHeading?: string;
  className?: string;
};

function AssignEmployeePicker({
  employees,
  selectedIds,
  assignPending,
  assignError,
  assignIsError,
  onToggle,
  onAssign,
}: {
  employees: Employee[];
  selectedIds: string[];
  assignPending: boolean;
  assignError: unknown;
  assignIsError: boolean;
  onToggle: (id: string) => void;
  onAssign: () => void;
}) {
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2">
        {employees.map((employee) => {
          const selected = selectedIds.includes(employee.id);
          return (
            <li key={employee.id}>
              <Button
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() => onToggle(employee.id)}
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
        disabled={selectedIds.length === 0 || assignPending}
        onClick={onAssign}
      >
        {assignPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <UserPlusIcon className="size-4" />
        )}
        Assign{selectedIds.length > 0 ? ` ${selectedIds.length}` : ""} selected
      </Button>
      {assignIsError && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(assignError, "Assigning failed.")}
        </p>
      )}
    </div>
  );
}

function RosterList({
  assignments,
  employeeById,
  revokePending,
  onRevoke,
}: {
  assignments: PackAssignment[];
  employeeById: Map<string, Employee>;
  revokePending: boolean;
  onRevoke: (assignmentId: string) => void;
}) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {assignments.map((assignment) => (
        <li key={assignment.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">
              {employeeById.get(assignment.employeeId)?.name ?? assignment.employeeId}
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
              disabled={revokePending}
              onClick={() => onRevoke(assignment.id)}
            >
              Revoke
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AssignHint({
  assignableCount,
  assignmentsCount,
  emptyOrgHint,
}: {
  assignableCount: number;
  assignmentsCount: number;
  emptyOrgHint?: ReactNode;
}) {
  if (assignableCount > 0) return null;

  if (assignmentsCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyOrgHint ??
          "No organization members found. Invite people in Clerk, then reopen Assign — members sync automatically."}
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Everyone in the org is already assigned to this quiz.
    </p>
  );
}

/** Shared assign/revoke roster used by pack detail Card and Quizzes Assign sheet. */
export function AssignmentRoster({
  packId,
  quizPublished,
  emptyOrgHint,
  emptyRosterHint = "No one is assigned to this pack yet.",
  chooseHeading = "Assign to employees",
  rosterHeading,
  className,
}: AssignmentRosterProps) {
  const employeesQuery = useEmployees();
  const assignmentsQuery = usePackAssignments(packId);
  const createAssignments = useCreateAssignments(packId);
  const revoke = useRevokeAssignment(packId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const assignments = assignmentsQuery.data ?? [];
  const assignedEmployeeIds = new Set(assignments.map((a) => a.employeeId));
  const employeeById = new Map((employeesQuery.data ?? []).map((e) => [e.id, e]));
  const assignableEmployees = (employeesQuery.data ?? []).filter(
    (e) => !assignedEmployeeIds.has(e.id),
  );

  function toggleEmployee(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleAssign() {
    if (selectedIds.length === 0) return;
    createAssignments.mutate(selectedIds, { onSuccess: () => setSelectedIds([]) });
  }

  const isLoading = employeesQuery.isLoading || assignmentsQuery.isLoading;
  const isError = employeesQuery.isError || assignmentsQuery.isError;

  return (
    <div className={cn("space-y-4", className)}>
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Could not load employees or assignments. Start the FastAPI service and refresh.
        </p>
      )}

      {!isLoading && !isError && quizPublished && (
        <>
          <section className="space-y-3" aria-labelledby={`assign-${packId}`}>
            {chooseHeading && (
              <h3 id={`assign-${packId}`} className="text-sm font-semibold">
                {chooseHeading}
              </h3>
            )}

            <AssignHint
              assignableCount={assignableEmployees.length}
              assignmentsCount={assignments.length}
              emptyOrgHint={emptyOrgHint}
            />

            {assignableEmployees.length > 0 && (
              <AssignEmployeePicker
                employees={assignableEmployees}
                selectedIds={selectedIds}
                assignPending={createAssignments.isPending}
                assignError={createAssignments.error}
                assignIsError={createAssignments.isError}
                onToggle={toggleEmployee}
                onAssign={handleAssign}
              />
            )}
          </section>

          <section className="space-y-3" aria-labelledby={`roster-${packId}`}>
            {rosterHeading && (
              <h3 id={`roster-${packId}`} className="text-sm font-semibold">
                {rosterHeading}
              </h3>
            )}

            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyRosterHint}</p>
            ) : (
              <RosterList
                assignments={assignments}
                employeeById={employeeById}
                revokePending={revoke.isPending}
                onRevoke={(assignmentId) => revoke.mutate(assignmentId)}
              />
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
