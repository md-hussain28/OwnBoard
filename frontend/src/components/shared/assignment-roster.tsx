"use client";

import { CheckIcon, Loader2Icon, SearchIcon, SparklesIcon, UserPlusIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
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
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Employee } from "@/schemas/employee.schema";
import type { PackAssignment } from "@/schemas/packAssignment.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
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

function matchesEmployeeQuery(employee: Employee, q: string) {
  if (!q) return true;
  const haystack = [
    employee.name,
    employee.role ?? "",
    employee.githubHandle ?? "",
    employee.domainName ?? "",
    employee.appRole,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function employeeSubtitle(employee: Employee) {
  const parts = [employee.role, employee.domainName, employee.githubHandle].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "No title set";
}

function AssignEmployeePicker({
  employees,
  selectedIds,
  assignPending,
  onToggle,
  onAssign,
}: {
  employees: Employee[];
  selectedIds: string[];
  assignPending: boolean;
  onToggle: (id: string) => void;
  onAssign: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((employee) => matchesEmployeeQuery(employee, q));
  }, [employees, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members by name, title, or domain…"
          aria-label="Search members"
          className="pl-9"
          autoFocus
        />
      </div>

      <ul
        className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border"
        aria-label="Organization members"
      >
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            {query.trim()
              ? `No members match “${query.trim()}”.`
              : "No members available to assign."}
          </li>
        )}
        {filtered.map((employee) => {
          const selected = selectedIds.includes(employee.id);
          return (
            <li key={employee.id}>
              <button
                type="button"
                onClick={() => onToggle(employee.id)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                  selected && "bg-brand-honey-soft/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-transparent",
                  )}
                  aria-hidden
                >
                  <CheckIcon className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{employee.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {employeeSubtitle(employee)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : `${employees.length} available`}
        </p>
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
      </div>
    </div>
  );
}

function RosterList({
  assignments,
  employeeById,
  revokePending,
  revokingId,
  onRevoke,
}: {
  assignments: PackAssignment[];
  employeeById: Map<string, Employee>;
  revokePending: boolean;
  revokingId: string | null;
  onRevoke: (assignmentId: string) => void;
}) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {assignments.map((assignment) => (
        <li key={assignment.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium">
              <span className="truncate">
                {employeeById.get(assignment.employeeId)?.name ?? assignment.employeeId}
              </span>
              {assignment.autoAssigned && (
                <Badge variant="outline" className="h-5 shrink-0 gap-1 px-1.5">
                  <SparklesIcon className="size-3" />
                  Auto
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {assignment.autoAssigned ? "Auto-assigned by audience · " : ""}
              {new Date(assignment.assignedAt).toLocaleDateString()}
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
              {revokingId === assignment.id && <Loader2Icon className="size-3.5 animate-spin" />}
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

/** Shared assign/revoke roster used by pack detail Card and Quizzes Assign modal. */
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
    const count = selectedIds.length;
    createAssignments.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([]);
        notify.success(count === 1 ? "1 person assigned" : `${count} people assigned`, {
          id: `assign:${packId}`,
        });
      },
      onError: (err) => {
        notify.apiError(err, "Assigning failed", { id: `assign-error:${packId}` });
      },
    });
  }

  function handleRevoke(assignmentId: string) {
    revoke.mutate(assignmentId, {
      onSuccess: () => {
        notify.success("Assignment revoked", { id: `revoke:${assignmentId}` });
      },
      onError: (err) => {
        notify.apiError(err, "Revoke failed", { id: `revoke-error:${assignmentId}` });
      },
    });
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
                revokingId={revoke.isPending ? (revoke.variables ?? null) : null}
                onRevoke={handleRevoke}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
