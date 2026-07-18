"use client";

import { ChevronRightIcon, CrownIcon, SearchIcon, StarIcon, UsersRoundIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, FilteredEmpty, FilterSelect, QueryState } from "@/components/shared";
import { useProjectFunctionTypes, useProjectMembers } from "@/hooks/queries/project";
import type { ProjectMember } from "@/schemas";
import { Badge, Input } from "@/ui";
import { MemberDetailSheet } from "./member-detail-sheet";
import { ReadinessBadge, readinessLabel } from "./readiness";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const READINESS_OPTIONS = [
  { value: "all", label: "All progress" },
  { value: "ready", label: "Ready" },
  { value: "in-progress", label: "In progress" },
  { value: "locked", label: "Not started" },
  { value: "open", label: "No onboarding" },
];

const EMPTY_MEMBERS = (
  <EmptyState
    icon={UsersRoundIcon}
    tone="mist"
    title="No members on this project yet"
    description="Members you add to this project will appear here."
  />
);

function matchesFilters(
  m: ProjectMember,
  q: string,
  functionFilter: string,
  readinessFilter: string,
): boolean {
  if (functionFilter !== "all" && m.functionTypeId !== functionFilter) return false;
  if (readinessFilter !== "all" && readinessLabel(m.readiness) !== readinessFilter) return false;
  if (!q) return true;
  const haystack =
    `${m.name} ${m.role ?? ""} ${m.githubHandle ?? ""} ${m.functionTypeName ?? ""} ${m.domainName ?? ""}`.toLowerCase();
  return haystack.includes(q);
}

export function ProjectMemberPanel({
  projectId,
  manageable = false,
}: {
  projectId: string;
  manageable?: boolean;
}) {
  const { data: members, isLoading, isError, error } = useProjectMembers(projectId);
  const { data: functionTypes } = useProjectFunctionTypes(projectId, manageable);
  const [query, setQuery] = useState("");
  const [functionFilter, setFunctionFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Resolve from the live list so the sheet reflects mutations (e.g. lead toggled) after refetch.
  const selected = (members ?? []).find((m) => m.employeeId === selectedId) ?? null;

  const functionOptions = useMemo(
    () => [
      { value: "all", label: "All roles" },
      ...(functionTypes ?? []).map((t) => ({ value: t.id, label: t.name })),
    ],
    [functionTypes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? []).filter((m) => matchesFilters(m, q, functionFilter, readinessFilter));
  }, [members, query, functionFilter, readinessFilter]);

  function openMember(m: ProjectMember) {
    setSelectedId(m.employeeId);
    setSheetOpen(true);
  }

  const hasFilters = query.trim() !== "" || functionFilter !== "all" || readinessFilter !== "all";

  function clearFilters() {
    setQuery("");
    setFunctionFilter("all");
    setReadinessFilter("all");
  }

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={!!members && members.length === 0}
      empty={EMPTY_MEMBERS}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search members"
              placeholder="Search members..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {(functionTypes ?? []).length > 0 && (
            <FilterSelect
              aria-label="Filter by role"
              value={functionFilter}
              onChange={setFunctionFilter}
              options={functionOptions}
            />
          )}
          <FilterSelect
            aria-label="Filter by progress"
            value={readinessFilter}
            onChange={setReadinessFilter}
            options={READINESS_OPTIONS}
          />
        </div>

        {filtered.length === 0 ? (
          <FilteredEmpty noun="members" onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {filtered.map((m) => (
              <li key={m.employeeId}>
                <button
                  type="button"
                  onClick={() => openMember(m)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-mist text-xs font-semibold text-brand-ink">
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      {m.isLead && (
                        <Badge variant="default">
                          <CrownIcon className="size-3" /> Lead
                        </Badge>
                      )}
                      {m.functionTypeName && (
                        <Badge variant="secondary">{m.functionTypeName}</Badge>
                      )}
                      {m.isGoTo && (
                        <Badge variant="success">
                          <StarIcon className="size-3" /> Go-to
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.role ?? m.domainName ?? "Member"}
                      {m.githubHandle ? ` · @${m.githubHandle}` : ""}
                    </p>
                  </div>
                  <ReadinessBadge readiness={m.readiness} />
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MemberDetailSheet
        projectId={projectId}
        member={selected}
        manageable={manageable}
        functionTypes={functionTypes ?? []}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </QueryState>
  );
}
