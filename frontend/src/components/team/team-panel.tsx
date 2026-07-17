"use client";

import { useState } from "react";
import Link from "next/link";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import {
  useInviteEmployee,
  useUpdateEmployee,
} from "@/hooks/queries/employee/employee.mutations";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import type { AppRole, Employee } from "@/schemas/employee.schema";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import { Badge } from "@/ui/badge";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  member: "Member",
};

function RoleSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: AppRole;
  onChange: (role: AppRole) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AppRole)}
      className={cn(
        "h-9 rounded-lg border border-input bg-background px-2.5 text-sm",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <option value="member">Member</option>
      <option value="admin">Admin</option>
    </select>
  );
}

function MemberRow({ employee, isSelf }: { employee: Employee; isSelf: boolean }) {
  const updateEmployee = useUpdateEmployee();
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);

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

  return (
    <li className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {employee.name}
          {isSelf && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {employee.role?.trim() || "No job title"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={employee.appRole === "admin" ? "default" : "secondary"}>
          {ROLE_LABEL[employee.appRole]}
        </Badge>
        <RoleSelect
          value={displayRole}
          onChange={handleRoleChange}
          disabled={updateEmployee.isPending}
          id={`role-${employee.id}`}
        />
      </div>
      {updateEmployee.isError && (
        <p className="text-sm text-destructive sm:basis-full">
          {getApiErrorMessage(updateEmployee.error)}
        </p>
      )}
    </li>
  );
}

export function TeamPanel() {
  const { isAdmin, isLoading: roleLoading, employeeId } = useAppRole();
  const employeesQuery = useEmployees();
  const invite = useInviteEmployee();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("member");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  if (roleLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-border px-5 py-8 text-center">
        <p className="font-medium">Admins only</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an organization admin to manage team access.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/">Back to workspace</Link>
        </Button>
      </div>
    );
  }

  function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setInviteMessage(null);
    invite.mutate(
      { email: trimmed, appRole: inviteRole },
      {
        onSuccess: (result) => {
          setEmail("");
          setInviteMessage(`Invitation sent to ${result.emailAddress}`);
        },
      },
    );
  }

  const employees = employeesQuery.data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Invite people with Clerk email invitations, then assign OwnBoard roles here.
          Clerk only handles sign-in and org membership.
        </p>
      </header>

      <section
        className="space-y-3 rounded-xl border border-border p-4 sm:p-5"
        aria-labelledby="invite-heading"
      >
        <h2 id="invite-heading" className="text-sm font-semibold">
          Invite someone
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="email"
            required
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sm:flex-1"
          />
          <RoleSelect value={inviteRole} onChange={setInviteRole} id="invite-role" />
          <Button type="submit" disabled={invite.isPending}>
            {invite.isPending ? "Sending…" : "Send invite"}
          </Button>
        </form>
        {invite.isError && (
          <p className="text-sm text-destructive">{getApiErrorMessage(invite.error)}</p>
        )}
        {inviteMessage && (
          <p className="text-sm text-muted-foreground">{inviteMessage}</p>
        )}
      </section>

      <section className="space-y-1" aria-labelledby="members-heading">
        <h2 id="members-heading" className="text-sm font-semibold">
          Members
        </h2>
        <p className="text-sm text-muted-foreground">
          Roles control who can manage quizzes, repos, and invitations.
        </p>

        {employeesQuery.isLoading && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {employeesQuery.isError && (
          <p className="mt-4 text-sm text-muted-foreground">
            Could not load members ({getApiErrorMessage(employeesQuery.error)}).
          </p>
        )}

        {!employeesQuery.isLoading && !employeesQuery.isError && employees.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No members yet. Send an invite above.</p>
        )}

        {!employeesQuery.isLoading && !employeesQuery.isError && employees.length > 0 && (
          <ul className="mt-2">
            {employees.map((employee) => (
              <MemberRow
                key={employee.id}
                employee={employee}
                isSelf={employee.id === employeeId}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
