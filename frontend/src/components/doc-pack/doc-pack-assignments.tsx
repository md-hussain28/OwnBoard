"use client";

import { useState } from "react";
import { CheckIcon, Loader2Icon, UserPlusIcon } from "lucide-react";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import { usePackAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import {
  useCreateAssignments,
  useRevokeAssignment,
} from "@/hooks/queries/pack-assignment/pack-assignment.mutations";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PackAssignmentStatus } from "@/schemas/packAssignment.schema";
import { getApiErrorMessage } from "@/lib/api/errors";

export const ASSIGNMENT_STATUS_LABEL: Record<PackAssignmentStatus, string> = {
  assigned: "Assigned",
  reading: "Reading",
  ready_for_quiz: "Ready for quiz",
  quiz_in_progress: "Quiz in progress",
  passed: "Passed",
  failed: "Failed",
};

export function assignmentStatusVariant(status: PackAssignmentStatus) {
  if (status === "passed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "quiz_in_progress") return "warning" as const;
  return "secondary" as const;
}

export function DocPackAssignments({
  packId,
  quizPublished,
}: {
  packId: string;
  quizPublished: boolean;
}) {
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
    <Card>
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!quizPublished && (
          <p className="text-sm text-muted-foreground">
            Save a curated quiz first — packs without a published quiz can’t be assigned.
          </p>
        )}

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not load employees or assignments. Start the FastAPI service and refresh.
          </p>
        )}

        {!isLoading && !isError && quizPublished && (
          <>
            {assignableEmployees.length === 0 && assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No organization members found. Invite people in Clerk, then reopen
                Assign — members sync automatically.
              </p>
            )}

            {assignableEmployees.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Assign to employees</p>
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
                  Assign {selectedIds.length > 0 ? `${selectedIds.length} ` : ""}selected
                </Button>
                {createAssignments.isError && (
                  <p className="text-sm text-destructive">
                    {getApiErrorMessage(createAssignments.error, "Assigning failed.")}
                  </p>
                )}
              </div>
            )}

            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one is assigned to this pack yet.</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {employeeById.get(assignment.employeeId)?.name ?? assignment.employeeId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
