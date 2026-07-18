"use client";

import { AtSignIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { EditMemberDialog, type MemberDialogMode } from "@/components/team/edit-member-dialog";
import { RoleSelect } from "@/components/team/role-select";
import { initials, memberSubtitle } from "@/components/team/team-constants";
import { TeamMemberSheet } from "@/components/team/team-member-sheet";
import { useUpdateEmployee } from "@/hooks/queries/employee/employee.mutations";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AppRole, Employee } from "@/schemas/employee.schema";
import type { OrgDomain } from "@/schemas/org-domain.schema";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<MemberDialogMode>("view");
  const [sheetOpen, setSheetOpen] = useState(false);

  function openDialog(mode: MemberDialogMode) {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  /** From the detail sheet's "Edit profile" button: close the sheet, open the edit dialog. */
  function editFromSheet() {
    setSheetOpen(false);
    openDialog("edit");
  }

  function handleRoleChange(appRole: AppRole) {
    if (appRole === employee.appRole) return;
    setPendingRole(appRole);
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
        onSettled: () => setPendingRole(null),
      },
    );
  }

  const displayRole = pendingRole ?? employee.appRole;
  const github = employee.githubHandle?.trim() || null;
  const subtitle = memberSubtitle(employee);

  return (
    <li
      className={cn(
        "group/row flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl px-2 py-2.5",
        "transition-colors duration-150 sm:gap-x-3 sm:px-3 sm:py-3",
        "hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left outline-none sm:gap-3 focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={`View details for ${employee.name}`}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold tracking-wide sm:size-9 sm:text-xs",
            employee.appRole === "admin"
              ? "bg-brand-honey-soft text-brand-honey"
              : "bg-muted text-muted-foreground",
          )}
        >
          {initials(employee.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug sm:text-base">
            {employee.name}
            {isSelf && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          {github && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <AtSignIcon className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{github}</span>
            </p>
          )}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${employee.name}`}
          onClick={() => openDialog("edit")}
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
          className="w-[6.75rem] min-w-0 sm:w-auto sm:min-w-[7.5rem]"
        />
      </div>

      <TeamMemberSheet
        employee={employee}
        isSelf={isSelf}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onEdit={editFromSheet}
      />

      <EditMemberDialog
        employee={employee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        domains={domains}
        isSelf={isSelf}
        initialMode={dialogMode}
      />
    </li>
  );
}
