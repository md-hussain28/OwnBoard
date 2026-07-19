"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useEmployees, usePendingInvitations } from "@/hooks/queries/employee";
import { useAppRole } from "@/hooks/queries/me";
import { useOrgDomains } from "@/hooks/queries/org-domain";
import { Button, Skeleton } from "@/ui";
import { InviteMemberDialog } from "./invite-member-dialog";
import { ManageDomainsDialog } from "./manage-domains-dialog";
import { PendingInvitationsSection } from "./pending-invitations-section";
import {
  PeopleCount,
  PeopleListBody,
  PeopleToolbar,
  peopleListState,
  usePeopleFilters,
} from "./team-people-list";

function TeamPanelSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function AdminsOnlyNotice() {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-10 text-center shadow-soft">
      <p className="font-medium">Admins only</p>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        Ask an organization admin to manage team access.
      </p>
      <Button className="mt-5" variant="outline" asChild>
        <Link href="/app">Back to workspace</Link>
      </Button>
    </div>
  );
}

function TeamHeader({
  domainsDisabled,
  onManageDomains,
  onInvite,
}: {
  domainsDisabled: boolean;
  onManageDomains: () => void;
  onInvite: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-balance">Team</h1>
        <p className="max-w-md text-sm text-muted-foreground text-pretty">
          Invite people, assign domains, and set who can manage the workspace.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onManageDomains}
          disabled={domainsDisabled}
        >
          Domains
        </Button>
        <Button type="button" size="sm" onClick={onInvite}>
          <PlusIcon className="size-3.5" strokeWidth={1.75} />
          Invite
        </Button>
      </div>
    </header>
  );
}

export function TeamPanel() {
  const { isAdmin, isLoading: roleLoading, employeeId } = useAppRole();
  const employeesQuery = useEmployees();
  const invitationsQuery = usePendingInvitations({ enabled: isAdmin });
  const domainsQuery = useOrgDomains();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);

  const employees = employeesQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const domains = domainsQuery.data ?? [];
  const filters = usePeopleFilters(employees, domains);
  const { filteredEmployees, hasActiveFilters, clearFilters } = filters;

  const listState = peopleListState(
    employeesQuery.isLoading,
    employeesQuery.isError,
    employees.length,
    filteredEmployees.length,
  );
  const hasPeople = listState === "no-matches" || listState === "list";

  if (roleLoading) return <TeamPanelSkeleton />;
  if (!isAdmin) return <AdminsOnlyNotice />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <TeamHeader
        domainsDisabled={domainsQuery.isLoading || domainsQuery.isError}
        onManageDomains={() => setDomainsOpen(true)}
        onInvite={() => setInviteOpen(true)}
      />

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} domains={domains} />

      <ManageDomainsDialog open={domainsOpen} onOpenChange={setDomainsOpen} domains={domains} />

      <PendingInvitationsSection
        invitations={invitations}
        isLoading={invitationsQuery.isLoading}
        isError={invitationsQuery.isError}
        error={invitationsQuery.error}
      />

      <section className="space-y-3" aria-labelledby="members-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="members-heading" className="text-sm font-semibold">
            People
          </h2>
          {hasPeople && (
            <PeopleCount
              hasActiveFilters={hasActiveFilters}
              filteredCount={filteredEmployees.length}
              totalCount={employees.length}
            />
          )}
        </div>

        {hasPeople && (
          <PeopleToolbar
            query={filters.query}
            onQueryChange={filters.setQuery}
            roleFilter={filters.roleFilter}
            onRoleFilterChange={filters.setRoleFilter}
            domainFilter={filters.domainFilter}
            onDomainFilterChange={filters.setDomainFilter}
            profileFilter={filters.profileFilter}
            onProfileFilterChange={filters.setProfileFilter}
            domainFilterOptions={filters.domainFilterOptions}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        )}

        <PeopleListBody
          listState={listState}
          error={employeesQuery.error}
          filteredEmployees={filteredEmployees}
          domains={domains}
          employeeId={employeeId}
          onClearFilters={clearFilters}
          onInvite={() => setInviteOpen(true)}
        />
      </section>
    </div>
  );
}
