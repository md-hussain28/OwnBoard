"use client";

import { PencilIcon, PlusIcon, SearchIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { useDocPacks } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import {
  type PackAssignmentProgress,
  usePackAssignmentProgress,
} from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { useQuizDomains } from "@/hooks/queries/quiz-domain/quiz-domain.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { DocPackListItem } from "@/schemas/docPack.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";

type PackStatus = DocPackListItem["status"];
type StatusFilter = "all" | PackStatus;
type AssignmentFilter = "all" | "assigned" | "unassigned";
type DomainFilter = "all" | "none" | string;

const STATUS_LABEL: Record<PackStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
  needs_review: "Needs review",
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "needs_review", label: "Needs review" },
  { value: "archived", label: "Archived" },
];

const ASSIGNMENT_FILTERS: { value: AssignmentFilter; label: string }[] = [
  { value: "all", label: "Anyone" },
  { value: "assigned", label: "Assigned" },
  { value: "unassigned", label: "Unassigned" },
];

function packStatusVariant(status: PackStatus) {
  if (status === "active") return "success" as const;
  if (status === "needs_review") return "warning" as const;
  if (status === "archived") return "outline" as const;
  return "secondary" as const;
}

function matchesDomain(pack: DocPackListItem, domainFilter: DomainFilter) {
  if (domainFilter === "all") return true;
  if (domainFilter === "none") return !pack.domainId;
  return pack.domainId === domainFilter;
}

function matchesAssignment(
  pack: DocPackListItem,
  assignmentFilter: AssignmentFilter,
  progressByPackId: Map<string, PackAssignmentProgress>,
) {
  if (assignmentFilter === "all") return true;
  const progress = progressByPackId.get(pack.id);
  const assigned = (progress?.count ?? 0) > 0;
  return assignmentFilter === "assigned" ? assigned : !assigned;
}

function matchesQuery(pack: DocPackListItem, q: string) {
  if (!q) return true;
  const haystack = [
    pack.name,
    pack.description ?? "",
    pack.domainName ?? "",
    STATUS_LABEL[pack.status],
    pack.status.replace("_", " "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function PackFilterBar({
  query,
  onQueryChange,
  domainFilter,
  onDomainFilterChange,
  domainFilters,
  statusFilter,
  onStatusFilterChange,
  assignmentFilter,
  onAssignmentFilterChange,
  isAdmin,
  hasActiveFilters,
  onClear,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  domainFilter: DomainFilter;
  onDomainFilterChange: (value: DomainFilter) => void;
  domainFilters: { value: DomainFilter; label: string }[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  assignmentFilter: AssignmentFilter;
  onAssignmentFilterChange: (value: AssignmentFilter) => void;
  isAdmin: boolean;
  hasActiveFilters: boolean;
  onClear: () => void;
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
          placeholder="Search tracks…"
          aria-label="Search tracks"
          className="pl-9"
        />
      </div>

      <FilterSelect
        value={domainFilter}
        onChange={onDomainFilterChange}
        options={domainFilters}
        aria-label="Filter by domain"
      />
      <FilterSelect
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={STATUS_FILTERS}
        aria-label="Filter by status"
      />
      {isAdmin && (
        <FilterSelect
          value={assignmentFilter}
          onChange={onAssignmentFilterChange}
          options={ASSIGNMENT_FILTERS}
          aria-label="Filter by assignment"
        />
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function EmptyPacksState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground text-pretty">
        {isAdmin
          ? "No tracks yet. Create one to upload documents and generate a cited quiz, then assign it to hires from this list."
          : "No tracks yet. An admin will create and assign them."}
      </p>
      {isAdmin && (
        <Button asChild>
          <Link href="/app/tracks/new">Create your first track</Link>
        </Button>
      )}
    </div>
  );
}

function NoMatchesState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        {query.trim()
          ? `No tracks match “${query.trim()}” with the current filters.`
          : "No tracks match the current filters."}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
      >
        Clear filters
      </button>
    </div>
  );
}

function PackProgressLine({ progress }: { progress: PackAssignmentProgress | undefined }) {
  if (progress?.loading) {
    return <Skeleton className="h-3 w-36" />;
  }
  return (
    <p className="text-xs text-muted-foreground">
      {progress?.text ?? "Not assigned yet"}
      {progress && progress.count > 0
        ? ` · ${progress.count} ${progress.count === 1 ? "person" : "people"}`
        : ""}
    </p>
  );
}

function PackRow({
  pack,
  isAdmin,
  progress,
  onAssignPack,
  onViewPack,
}: {
  pack: DocPackListItem;
  isAdmin: boolean;
  progress: PackAssignmentProgress | undefined;
  onAssignPack: (packId: string) => void;
  onViewPack: (packId: string) => void;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-4 transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5",
        "cursor-pointer hover:bg-muted/40",
      )}
      onClick={() => onViewPack(pack.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewPack(pack.id);
        }
      }}
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: row opens the view sheet
      role="button"
      tabIndex={0}
      aria-label={`View details for ${pack.name}`}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 font-medium leading-snug text-balance">{pack.name}</p>
          <Badge variant={packStatusVariant(pack.status)} className="shrink-0">
            {STATUS_LABEL[pack.status]}
          </Badge>
        </div>

        {(pack.domainName || pack.description) && (
          <div className="space-y-1">
            {pack.domainName && (
              <Badge variant="outline" className="max-w-full truncate">
                {pack.domainName}
              </Badge>
            )}
            {pack.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground text-pretty sm:line-clamp-1">
                {pack.description}
              </p>
            )}
          </div>
        )}

        {isAdmin && <PackProgressLine progress={progress} />}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            onClick={(e) => {
              e.stopPropagation();
              onAssignPack(pack.id);
            }}
          >
            <UserPlusIcon className="size-3.5" />
            Assign
          </Button>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link href={`/app/tracks/${pack.id}`} onClick={(e) => e.stopPropagation()}>
              <PencilIcon className="size-3.5" />
              Edit
            </Link>
          </Button>
        </div>
      )}
    </li>
  );
}

export function QuizPackList({
  onAssignPack,
  onViewPack,
}: {
  onAssignPack: (packId: string) => void;
  onViewPack: (packId: string) => void;
}) {
  const { isAdmin } = useAppRole();
  const { data: packs, isLoading, isError, error } = useDocPacks();
  const domainsQuery = useQuizDomains({ enabled: isAdmin });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");

  const packIds = useMemo(() => (packs ?? []).map((p) => p.id), [packs]);
  const domains = domainsQuery.data ?? [];
  const progressByPackId = usePackAssignmentProgress(packIds, isAdmin);

  const domainFilters: { value: DomainFilter; label: string }[] = useMemo(
    () => [
      { value: "all", label: "All domains" },
      { value: "none", label: "No domain" },
      ...domains.map((d) => ({ value: d.id, label: d.name })),
    ],
    [domains],
  );

  const filteredPacks = useMemo(() => {
    const list = packs ?? [];
    const q = query.trim().toLowerCase();
    return list.filter(
      (pack) =>
        (statusFilter === "all" || pack.status === statusFilter) &&
        matchesDomain(pack, domainFilter) &&
        matchesAssignment(pack, assignmentFilter, progressByPackId) &&
        matchesQuery(pack, q),
    );
  }, [packs, query, statusFilter, assignmentFilter, domainFilter, progressByPackId]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    assignmentFilter !== "all" ||
    domainFilter !== "all";

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setAssignmentFilter("all");
    setDomainFilter("all");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Tracks</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            {isAdmin
              ? "Every track you can assign. Open Assign to pick people and see who has passed."
              : "Published tracks in your organization. Your assigned reading is under Readiness."}
          </p>
        </div>
        {isAdmin && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/app/tracks/new">
              <PlusIcon className="size-4" />
              Create track
            </Link>
          </Button>
        )}
      </div>

      {!isLoading && !isError && (packs?.length ?? 0) > 0 && (
        <PackFilterBar
          query={query}
          onQueryChange={setQuery}
          domainFilter={domainFilter}
          onDomainFilterChange={setDomainFilter}
          domainFilters={domainFilters}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          assignmentFilter={assignmentFilter}
          onAssignmentFilterChange={setAssignmentFilter}
          isAdmin={isAdmin}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Could not reach the backend ({getApiErrorMessage(error)}). Start the FastAPI service and
          refresh.
        </p>
      )}

      {!isLoading && !isError && packs?.length === 0 && <EmptyPacksState isAdmin={isAdmin} />}

      {!isLoading && !isError && packs && packs.length > 0 && filteredPacks.length === 0 && (
        <NoMatchesState query={query} onClear={clearFilters} />
      )}

      {!isLoading && !isError && filteredPacks.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background shadow-soft">
          {filteredPacks.map((pack) => (
            <PackRow
              key={pack.id}
              pack={pack}
              isAdmin={isAdmin}
              progress={progressByPackId.get(pack.id)}
              onAssignPack={onAssignPack}
              onViewPack={onViewPack}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
