"use client";

import { CheckCircle2Icon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { ManageDomainsDialog } from "@/components/team/manage-domains-dialog";
import { MemberRow } from "@/components/team/member-row";
import {
  type DomainFilter,
  matchesEmployee,
  PROFILE_FILTERS,
  type ProfileFilter,
  ROLE_FILTERS,
  type RoleFilter,
} from "@/components/team/team-constants";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { useOrgDomains } from "@/hooks/queries/org-domain/org-domain.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";

export function TeamPanel() {
  const { isAdmin, isLoading: roleLoading, employeeId } = useAppRole();
  const employeesQuery = useEmployees();
  const domainsQuery = useOrgDomains();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");

  const employees = employeesQuery.data ?? [];
  const domains = domainsQuery.data ?? [];
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

  if (roleLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center shadow-soft">
        <p className="font-medium">Admins only</p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Ask an organization admin to manage team access.
        </p>
        <Button className="mt-5" variant="outline" asChild>
          <Link href="/">Back to workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
            onClick={() => setDomainsOpen(true)}
            disabled={domainsQuery.isLoading || domainsQuery.isError}
          >
            Domains
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setInviteMessage(null);
              setInviteOpen(true);
            }}
          >
            <PlusIcon className="size-3.5" strokeWidth={1.75} />
            Invite
          </Button>
        </div>
      </header>

      {inviteMessage && (
        <p
          role="status"
          className="flex items-center gap-1.5 rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2Icon className="size-3.5 shrink-0" aria-hidden />
          {inviteMessage}
        </p>
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        domains={domains}
        onSent={(emailAddress) => {
          setInviteMessage(`Invitation sent to ${emailAddress}`);
        }}
      />

      <ManageDomainsDialog open={domainsOpen} onOpenChange={setDomainsOpen} domains={domains} />

      <section className="space-y-3" aria-labelledby="members-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="members-heading" className="text-sm font-semibold">
            People
          </h2>
          {!employeesQuery.isLoading && !employeesQuery.isError && employees.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {hasActiveFilters
                ? `${filteredEmployees.length} of ${employees.length}`
                : `${employees.length} ${employees.length === 1 ? "person" : "people"}`}
            </span>
          )}
        </div>

        {!employeesQuery.isLoading && !employeesQuery.isError && employees.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 basis-48">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, title, or GitHub…"
                aria-label="Search people"
                className="pl-9"
              />
            </div>

            <FilterSelect
              value={roleFilter}
              onChange={setRoleFilter}
              options={ROLE_FILTERS}
              aria-label="Filter by app role"
            />
            <FilterSelect
              value={domainFilter}
              onChange={setDomainFilter}
              options={domainFilterOptions}
              aria-label="Filter by domain"
            />
            <FilterSelect
              value={profileFilter}
              onChange={setProfileFilter}
              options={PROFILE_FILTERS}
              aria-label="Filter by profile completeness"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {employeesQuery.isLoading && (
          <div className="space-y-2 rounded-xl border border-border p-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        )}

        {employeesQuery.isError && (
          <p className="rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground">
            Could not load people ({getApiErrorMessage(employeesQuery.error)}).
          </p>
        )}

        {!employeesQuery.isLoading && !employeesQuery.isError && employees.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No one here yet. Invite someone to get started.
          </p>
        )}

        {!employeesQuery.isLoading &&
          !employeesQuery.isError &&
          employees.length > 0 &&
          filteredEmployees.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No one matches your search or filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

        {!employeesQuery.isLoading && !employeesQuery.isError && filteredEmployees.length > 0 && (
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
        )}
      </section>
    </div>
  );
}
