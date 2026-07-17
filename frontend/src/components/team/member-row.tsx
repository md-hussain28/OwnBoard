"use client";

import { AtSignIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { EditMemberDialog } from "@/components/team/edit-member-dialog";
import { RoleSelect } from "@/components/team/role-select";
import { initials, ROLE_META } from "@/components/team/team-constants";
import { useUpdateEmployee } from "@/hooks/queries/employee/employee.mutations";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { AppRole, Employee } from "@/schemas/employee.schema";
import type { OrgDomain } from "@/schemas/org-domain.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";

export function MemberRow({
  employee,
  isSelf,
  domains,
}: {
  employee: Employee;
  isSelf: boolean;
  domains: OrgDomain[];
}) {
  const updateEmployee = useUpdateEmployee();
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [editing, setEditing] = useState(false);

  function handleRoleChange(appRole: AppRole) {
    if (appRole === employee.appRole) return;
    setPendingRole(appRole);
    updateEmployee.mutate(
      { id: employee.id, input: { appRole } },
      {
        onSettled: () => setPendingRole(null),
      },
    );
  }

  const displayRole = pendingRole ?? employee.appRole;
  const jobTitle = employee.role?.trim() || null;
  const github = employee.githubHandle?.trim() || null;
  const domainLabel = employee.domainName?.trim() || null;

  return (
    <li
      className={cn(
        "group/row flex flex-col gap-3 rounded-xl px-3 py-3.5 transition-colors duration-150",
        "hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide",
            employee.appRole === "admin"
              ? "bg-brand-honey-soft text-brand-honey"
              : "bg-muted text-muted-foreground",
          )}
        >
          {initials(employee.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium leading-snug">
            {employee.name}
            {isSelf && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {[domainLabel, jobTitle ?? "No job title"].filter(Boolean).join(" · ")}
          </p>
          {github && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <AtSignIcon className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{github}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 pl-12 sm:pl-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${employee.name}`}
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <PencilIcon />
        </Button>
        <RoleSelect
          value={displayRole}
          onChange={handleRoleChange}
          disabled={updateEmployee.isPending}
          id={`role-${employee.id}`}
          size="sm"
        />
      </div>
      {updateEmployee.isError && (
        <p className="text-sm text-destructive sm:basis-full sm:pl-12">
          {getApiErrorMessage(updateEmployee.error)}
        </p>
      )}

      <EditMemberDialog
        employee={employee}
        open={editing}
        onOpenChange={setEditing}
        domains={domains}
      />
    </li>
  );
}
