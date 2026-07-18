"use client";

import {
  AtSignIcon,
  BriefcaseIcon,
  FolderIcon,
  GitCommitHorizontalIcon,
  LayersIcon,
  PencilIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { RoleSelect } from "@/components/team/role-select";
import { displayJobTitle, initials, ROLE_META } from "@/components/team/team-constants";
import { useUpdateEmployee } from "@/hooks/queries/employee/employee.mutations";
import { useEmployeeAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AppRole, Employee } from "@/schemas/employee.schema";
import type { PackAssignment } from "@/schemas/packAssignment.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Separator } from "@/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/ui/sheet";
import { Skeleton } from "@/ui/skeleton";

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-baseline gap-2 py-0.5">
      <span className="mt-0.5 shrink-0 self-start text-muted-foreground">{icon}</span>
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <p className="min-w-0 flex-1 text-sm text-foreground text-pretty leading-snug">{value}</p>
    </li>
  );
}

/** The tracks / onboarding modules this person has been assigned to. */
function TracksSection({ employeeId, open }: { employeeId: string; open: boolean }) {
  const { data, isLoading, isError } = useEmployeeAssignments(employeeId, { enabled: open });
  const assignments = data ?? [];
  const showCount = !isLoading && !isError && assignments.length > 0;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tracks &amp; onboarding
        </h3>
        {showCount && (
          <span className="text-xs tabular-nums text-muted-foreground">{assignments.length}</span>
        )}
      </div>

      <TracksBody isLoading={isLoading} isError={isError} assignments={assignments} />
    </section>
  );
}

function TracksBody({
  isLoading,
  isError,
  assignments,
}: {
  isLoading: boolean;
  isError: boolean;
  assignments: PackAssignment[];
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-border px-3 py-4 text-xs text-muted-foreground">
        Could not load assigned tracks.
      </p>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        <LayersIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>Not assigned to any tracks yet.</span>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {assignments.map((assignment) => (
        <AssignmentItem key={assignment.id} assignment={assignment} />
      ))}
    </ul>
  );
}

function AssignmentItem({ assignment }: { assignment: PackAssignment }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-snug">
          {assignment.docPackName ?? "Untitled track"}
        </p>
        {assignment.passPct != null && (
          <p className="text-xs text-muted-foreground">Score {Math.round(assignment.passPct)}%</p>
        )}
      </div>
      <Badge variant={assignmentStatusVariant(assignment.status)} className="shrink-0">
        {ASSIGNMENT_STATUS_LABEL[assignment.status]}
      </Badge>
    </li>
  );
}

/**
 * Right-side drawer with the full profile for one org member: identity, profile facts, the
 * tracks they're assigned to, and quick access controls. Row click opens this; the pencil / the
 * Edit button here hand off to {@link EditMemberDialog} for editing.
 */
export function TeamMemberSheet({
  employee,
  isSelf,
  open,
  onOpenChange,
  onEdit,
}: {
  employee: Employee;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  const updateEmployee = useUpdateEmployee();
  const roleMeta = ROLE_META[employee.appRole];
  const github = employee.githubHandle?.trim() || null;

  function handleRoleChange(appRole: AppRole) {
    if (appRole === employee.appRole) return;
    updateEmployee.mutate(
      { id: employee.id, input: { appRole } },
      {
        onSuccess: () => {
          notify.success("Access updated", {
            description: `${employee.name} is now ${appRole === "admin" ? "an admin" : "a member"}.`,
            id: `role:${employee.id}`,
          });
        },
        onError: (err) => {
          notify.apiError(err, "Could not update access", { id: `role-error:${employee.id}` });
        },
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-hidden sm:max-w-md">
        <SheetHeader className="pr-10">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-wide",
                employee.appRole === "admin"
                  ? "bg-brand-honey-soft text-brand-honey"
                  : "bg-brand-mist text-brand-ink",
              )}
            >
              {initials(employee.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="min-w-0 truncate">
                  {employee.name}
                  {isSelf && (
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">(you)</span>
                  )}
                </SheetTitle>
                <Badge
                  variant="secondary"
                  className={cn(
                    "shrink-0 gap-1",
                    employee.appRole === "admin" &&
                      "border-primary/25 bg-primary/10 text-foreground",
                  )}
                >
                  <roleMeta.Icon className="size-2.5" aria-hidden />
                  {roleMeta.label}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {displayJobTitle(employee.role) ?? "No job title yet"}
                {github ? (
                  <>
                    {" · "}
                    <a
                      href={`https://github.com/${github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground"
                    >
                      @{github}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Profile
            </h3>
            <ul className="grid gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
              <DetailRow
                icon={<BriefcaseIcon className="size-3.5" aria-hidden />}
                label="Title"
                value={displayJobTitle(employee.role) ?? "Not set"}
              />
              <DetailRow
                icon={<FolderIcon className="size-3.5" aria-hidden />}
                label="Domain"
                value={employee.domainName?.trim() || "Unassigned"}
              />
              <DetailRow
                icon={<AtSignIcon className="size-3.5" aria-hidden />}
                label="GitHub"
                value={github ? `@${github}` : "Not set"}
              />
            </ul>
          </section>

          <Separator />

          <TracksSection employeeId={employee.id} open={open} />

          <Separator />

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Skills
            </h3>
            <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <GitCommitHorizontalIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Commit-derived skills are shown per project, under each project&apos;s Members tab.
              </span>
            </div>
          </section>
        </div>

        <SheetFooter className="mt-auto gap-2 border-t">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Access
          </h3>
          <div className="flex items-center gap-2">
            <RoleSelect
              value={employee.appRole}
              onChange={handleRoleChange}
              disabled={updateEmployee.isPending}
              id={`sheet-role-${employee.id}`}
              className="flex-1"
            />
            <Button type="button" variant="outline" className="shrink-0" onClick={onEdit}>
              <PencilIcon className="size-3.5" aria-hidden />
              Edit profile
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
