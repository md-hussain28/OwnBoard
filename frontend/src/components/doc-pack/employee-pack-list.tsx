"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import { useMe } from "@/hooks/queries/me/me.queries";
import { useEmployeeAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { useDocPacks } from "@/hooks/queries/doc-pack/doc-pack.queries";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/doc-pack/doc-pack-assignments";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";

/**
 * Employee "tests left" list (Doc Pack PRD §7). Defaults to the signed-in member's
 * employee row; admins can still switch "viewing as" for demos.
 */
export function EmployeePackList() {
  const meQuery = useMe();
  const employeesQuery = useEmployees();
  const [employeeId, setEmployeeId] = useState("");
  const assignmentsQuery = useEmployeeAssignments(employeeId);
  const packsQuery = useDocPacks();

  useEffect(() => {
    if (employeeId) return;
    if (meQuery.data?.employeeId) {
      setEmployeeId(meQuery.data.employeeId);
    }
  }, [employeeId, meQuery.data?.employeeId]);

  const employees = employeesQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];
  const packById = new Map((packsQuery.data ?? []).map((p) => [p.id, p]));
  const testsLeft = assignments.filter((a) => a.status !== "passed").length;
  const isAdmin = meQuery.data?.appRole === "admin";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Assigned packs
          {employeeId && !assignmentsQuery.isLoading && (
            <Badge variant={testsLeft > 0 ? "secondary" : "default"}>
              {testsLeft > 0 ? `${testsLeft} test${testsLeft > 1 ? "s" : ""} left` : "All passed"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {employeesQuery.isLoading && <Skeleton className="h-9 w-full" />}
        {employeesQuery.isError && (
          <p className="text-sm text-muted-foreground">
            Could not load employees. Start the FastAPI service and refresh.
          </p>
        )}

        {isAdmin && !employeesQuery.isLoading && !employeesQuery.isError && (
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
                  onClick={() => setEmployeeId(employee.id)}
                >
                  {employee.name}
                </Button>
              ))}
            </div>
          </div>
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
          <>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No packs assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((assignment) => (
                  <li key={assignment.id}>
                    <Link
                      href={`/onboarding/packs/${assignment.id}`}
                      className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-shadow duration-200 hover:shadow-soft"
                    >
                      <div>
                        <p className="font-medium">
                          {packById.get(assignment.docPackId)?.name ?? "Doc pack"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={assignmentStatusVariant(assignment.status)}>
                        {ASSIGNMENT_STATUS_LABEL[assignment.status]}
                      </Badge>
                    </Link>
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
