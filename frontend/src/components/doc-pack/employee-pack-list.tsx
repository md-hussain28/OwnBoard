"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { useDocPacks } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import { useAppRole, useMe } from "@/hooks/queries/me/me.queries";
import { useEmployeeAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { cn } from "@/lib/utils";
import type { DocPackListItem } from "@/schemas/docPack.schema";
import type { Employee } from "@/schemas/employee.schema";
import type { PackAssignment } from "@/schemas/packAssignment.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

function TestsLeftBadge({ testsLeft }: { testsLeft: number }) {
  return (
    <Badge variant={testsLeft > 0 ? "secondary" : "default"}>
      {testsLeft > 0 ? `${testsLeft} test${testsLeft > 1 ? "s" : ""} left` : "All passed"}
    </Badge>
  );
}

function ViewingAsPicker({
  employees,
  employeeId,
  onSelect,
}: {
  employees: Employee[];
  employeeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Viewing as</p>
      <div className="flex flex-wrap gap-2">
        {employees.length === 0 && (
          <p className="text-sm text-muted-foreground">No employees in this org yet.</p>
        )}
        {employees.map((employee) => (
          <Button
            key={employee.id}
            type="button"
            size="sm"
            variant={employeeId === employee.id ? "default" : "outline"}
            onClick={() => onSelect(employee.id)}
          >
            {employee.name}
          </Button>
        ))}
      </div>
    </div>
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

function AssignmentList({
  assignments,
  packById,
}: {
  assignments: PackAssignment[];
  packById: Map<string, DocPackListItem>;
}) {
  if (assignments.length === 0) {
    return <p className="text-sm text-muted-foreground">No packs assigned yet.</p>;
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
                  <span className="truncate">
                    {assignment.docPackName ??
                      packById.get(assignment.docPackId)?.name ??
                      "Doc pack"}
                  </span>
                  {isNew && (
                    <Badge variant="warning" className="h-5 shrink-0 px-1.5 text-[0.65rem]">
                      New
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                </p>
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
 * Employee "tests left" list (Doc Pack PRD §7). Defaults to the signed-in member's
 * employee row; admins can still switch "viewing as" for demos.
 */
export function EmployeePackList() {
  const meQuery = useMe();
  const { isAdmin } = useAppRole();
  const employeesQuery = useEmployees({ enabled: isAdmin });
  const [employeeId, setEmployeeId] = useState("");
  const assignmentsQuery = useEmployeeAssignments(employeeId);
  const packsQuery = useDocPacks({ enabled: isAdmin });

  useEffect(() => {
    if (employeeId) return;
    if (meQuery.data?.employeeId) {
      setEmployeeId(meQuery.data.employeeId);
    }
  }, [employeeId, meQuery.data?.employeeId]);

  const assignments = assignmentsQuery.data ?? [];
  const packById = new Map((packsQuery.data ?? []).map((p) => [p.id, p]));
  const testsLeft = assignments.filter((a) => a.status !== "passed").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Assigned packs
          {employeeId && !assignmentsQuery.isLoading && <TestsLeftBadge testsLeft={testsLeft} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && employeesQuery.isLoading && <Skeleton className="h-9 w-full" />}
        {isAdmin && employeesQuery.isError && (
          <p className="text-sm text-muted-foreground">
            Could not load employees. Start the FastAPI service and refresh.
          </p>
        )}

        {isAdmin && !employeesQuery.isLoading && !employeesQuery.isError && (
          <ViewingAsPicker
            employees={employeesQuery.data ?? []}
            employeeId={employeeId}
            onSelect={setEmployeeId}
          />
        )}

        {employeeId && assignmentsQuery.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {employeeId && assignmentsQuery.isError && (
          <p className="text-sm text-muted-foreground">Could not load assignments.</p>
        )}

        {employeeId && !assignmentsQuery.isLoading && !assignmentsQuery.isError && (
          <AssignmentList assignments={assignments} packById={packById} />
        )}
      </CardContent>
    </Card>
  );
}
