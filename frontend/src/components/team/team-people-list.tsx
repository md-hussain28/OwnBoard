"use client";

import { PlusIcon, SearchIcon, UserPlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, FilteredEmpty, FilterSelect } from "@/components/shared";
import { getApiErrorMessage } from "@/lib/api";
import type { Employee, OrgDomain } from "@/schemas";
import { Button, Input, Skeleton } from "@/ui";
import { MemberRow } from "./member-row";
import {
  type DomainFilter,
  matchesEmployee,
  PROFILE_FILTERS,
  type ProfileFilter,
  ROLE_FILTERS,
  type RoleFilter,
} from "./team-constants";

// The searchable/filterable people list that makes up most of the Team page: the derived
// list state machine, the filter toolbar, the count, the list body, and the filter hook.

export type PeopleListState = "loading" | "error" | "empty" | "no-matches" | "list";

export function peopleListState(
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

export function PeopleToolbar({
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

export function PeopleCount({
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

export function PeopleListBody({
  listState,
  error,
  filteredEmployees,
  domains,
  employeeId,
  onClearFilters,
  onInvite,
}: {
  listState: PeopleListState;
  error: unknown;
  filteredEmployees: Employee[];
  domains: OrgDomain[];
  employeeId: string | null | undefined;
  onClearFilters: () => void;
  onInvite: () => void;
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
      <EmptyState
        icon={UserPlusIcon}
        tone="honey"
        title="No one here yet"
        description="Invite your teammates so you can assign onboarding and track progress."
        action={
          <Button type="button" size="sm" onClick={onInvite}>
            <PlusIcon className="size-3.5" strokeWidth={1.75} />
            Invite
          </Button>
        }
      />
    );
  }

  if (listState === "no-matches") {
    return <FilteredEmpty noun="people" onClear={onClearFilters} />;
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

/** Search/filter state for the people list plus everything derived from it. */
export function usePeopleFilters(employees: Employee[], domains: OrgDomain[]) {
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
