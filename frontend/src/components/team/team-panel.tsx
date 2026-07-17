"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { ManageDomainsDialog } from "@/components/team/manage-domains-dialog";
import { MemberRow } from "@/components/team/member-row";
import { PendingInvitationRow } from "@/components/team/pending-invitation-row";
import {
  type DomainFilter,
  matchesEmployee,
  PROFILE_FILTERS,
  type ProfileFilter,
  ROLE_FILTERS,
  type RoleFilter,
} from "@/components/team/team-constants";
import {
  useEmployees,
  usePendingInvitations,
} from "@/hooks/queries/employee/employee.queries";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { useOrgDomains } from "@/hooks/queries/org-domain/org-domain.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Employee, EmployeeInvitation } from "@/schemas/employee.schema";
import type { OrgDomain } from "@/schemas/org-domain.schema";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";

type PeopleListState = "loading" | "error" | "empty" | "no-matches" | "list";

function peopleListState(
  isLoading: boolean,
  isError: boolean,
  totalCount: number,
  filteredCount: number,
): PeopleListState {
  if (isLoading) return "loading";
  if (isError) return "error";
  if (totalCount === 0) return "empty";
  if (filteredCount === 0) return "no-matches";
  return "list";
}

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

function PeopleToolbar({
  query,
  onQueryChange,
  roleFilter,
  onRoleFilterChange,
  domainFilter,
  onDomainFilterChange,
  profileFilter,
  onProfileFilterChange,
  domainFilterOptions,
  hasActiveFilters,
  onClearFilters,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (value: RoleFilter) => void;
  domainFilter: DomainFilter;
  onDomainFilterChange: (value: DomainFilter) => void;
  profileFilter: ProfileFilter;
  onProfileFilterChange: (value: ProfileFilter) => void;
  domainFilterOptions: { value: DomainFilter; label: string }[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 basis-48">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search name, title, or GitHub…"
          aria-label="Search people"
          className="pl-9"
        />
      </div>

      <FilterSelect
        value={roleFilter}
        onChange={onRoleFilterChange}
        options={ROLE_FILTERS}
        aria-label="Filter by app role"
      />
      <FilterSelect
        value={domainFilter}
        onChange={onDomainFilterChange}
        options={domainFilterOptions}
        aria-label="Filter by domain"
      />
      <FilterSelect
        value={profileFilter}
        onChange={onProfileFilterChange}
        options={PROFILE_FILTERS}
        aria-label="Filter by profile completeness"
      />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function PeopleCount({
  hasActiveFilters,
  filteredCount,
  totalCount,
}: {
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      {hasActiveFilters
        ? `${filteredCount} of ${totalCount}`
        : `${totalCount} ${totalCount === 1 ? "person" : "people"}`}
    </span>
  );
}

function PeopleListBody({
  listState,
  error,
  filteredEmployees,
  domains,
  employeeId,
  onClearFilters,
}: {
  listState: PeopleListState;
  error: unknown;
  filteredEmployees: Employee[];
  domains: OrgDomain[];
  employeeId: string | null | undefined;
  onClearFilters: () => void;
}) {
  if (listState === "loading") {
    return (
      <div className="space-y-2 rounded-xl border border-border p-2">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }

  if (listState === "error") {
    return (
      <p className="rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground">
        Could not load people ({getApiErrorMessage(error)}).
      </p>
    );
  }

  if (listState === "empty") {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No one here yet. Invite someone to get started.
      </p>
    );
  }

  if (listState === "no-matches") {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">No one matches your search or filters.</p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <ul className="rounded-xl border border-border bg-card p-1.5 shadow-soft">
      {filteredEmployees.map((employee) => (
        <MemberRow
          key={employee.id}
          employee={employee}
          isSelf={employee.id === employeeId}
          domains={domains}
        />
      ))}
    </ul>
  );
}

function PendingInvitationsSection({
  invitations,
  isLoading,
  isError,
  error,
}: {
  invitations: EmployeeInvitation[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <section className="space-y-3" aria-labelledby="pending-invites-heading">
        <h2 id="pending-invites-heading" className="text-sm font-semibold">
          Pending invites
        </h2>
        <div className="space-y-2 rounded-xl border border-border p-2">
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-3" aria-labelledby="pending-invites-heading">
        <h2 id="pending-invites-heading" className="text-sm font-semibold">
          Pending invites
        </h2>
        <p className="rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground">
          Could not load invitations ({getApiErrorMessage(error)}).
        </p>
      </section>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="pending-invites-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="pending-invites-heading" className="text-sm font-semibold">
          Pending invites
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {invitations.length} {invitations.length === 1 ? "invite" : "invites"}
        </span>
      </div>
      <ul className="rounded-xl border border-border bg-card p-1.5 shadow-soft">
        {invitations.map((invitation) => (
          <PendingInvitationRow key={invitation.id} invitation={invitation} />
        ))}
      </ul>
    </section>
  );
}

/** Search/filter state for the people list plus everything derived from it. */
function usePeopleFilters(employees: Employee[], domains: OrgDomain[]) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");

  const normalizedQuery = query.trim().toLowerCase();

  const domainFilterOptions = useMemo(
    () => [
      { value: "all" as const, label: "All domains" },
      { value: "unassigned" as const, label: "No domain" },
      ...domains.map((d) => ({ value: d.id, label: d.name })),
    ],
    [domains],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        matchesEmployee(employee, normalizedQuery, roleFilter, profileFilter, domainFilter),
      ),
    [employees, normalizedQuery, roleFilter, profileFilter, domainFilter],
  );

  const hasActiveFilters =
    normalizedQuery.length > 0 ||
    roleFilter !== "all" ||
    profileFilter !== "all" ||
    domainFilter !== "all";

  function clearFilters() {
    setQuery("");
    setRoleFilter("all");
    setProfileFilter("all");
    setDomainFilter("all");
  }

  return {
    query,
    setQuery,
    roleFilter,
    setRoleFilter,
    profileFilter,
    setProfileFilter,
    domainFilter,
    setDomainFilter,
    domainFilterOptions,
    filteredEmployees,
    hasActiveFilters,
    clearFilters,
  };
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
        />
      </section>
    </div>
  );
}
