"use client";

import { GitBranchIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { repoSlug } from "@/components/repo";
import { EmptyState, FilteredEmpty, FilterSelect } from "@/components/shared";
import { useRepos } from "@/hooks/queries/repo";
import type { ProjectDetail, ProjectRepo } from "@/schemas";
import { Input } from "@/ui";
import { LinkRepoDialog } from "./link-repo-dialog";
import { ProjectSectionHeader } from "./project-section-header";
import { RepoDetailSheet } from "./repo-detail-sheet";
import { RepoRow } from "./repo-row";

type SyncFilter = "all" | "synced" | "unsynced";
type PeopleFilter = "all" | "assigned" | "unassigned";
type SortKey = "name" | "people" | "primary" | "sync";

const SYNC_OPTIONS: { value: SyncFilter; label: string }[] = [
  { value: "all", label: "All repos" },
  { value: "synced", label: "Synced" },
  { value: "unsynced", label: "Not synced" },
];

const PEOPLE_OPTIONS: { value: PeopleFilter; label: string }[] = [
  { value: "all", label: "Anyone assigned" },
  { value: "assigned", label: "Has assignees" },
  { value: "unassigned", label: "No one assigned" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Sort: Name" },
  { value: "people", label: "Sort: Most people" },
  { value: "primary", label: "Sort: Primary first" },
  { value: "sync", label: "Sort: Synced first" },
];

function repoMatches(
  r: ProjectRepo,
  q: string,
  syncFilter: SyncFilter,
  peopleFilter: PeopleFilter,
  syncedById: Map<string, boolean>,
): boolean {
  if (q) {
    const hay = `${r.name ?? ""} ${r.url ?? ""} ${repoSlug(r.url) ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  const synced = Boolean(syncedById.get(r.repoId));
  if (syncFilter === "synced" && !synced) return false;
  if (syncFilter === "unsynced" && synced) return false;
  const assigned = r.assignees.length > 0;
  if (peopleFilter === "assigned" && !assigned) return false;
  if (peopleFilter === "unassigned" && assigned) return false;
  return true;
}

function repoComparator(sort: SortKey, syncedById: Map<string, boolean>) {
  const label = (r: ProjectRepo) => (r.name ?? repoSlug(r.url) ?? r.repoId).toLowerCase();
  return (a: ProjectRepo, b: ProjectRepo): number => {
    switch (sort) {
      case "people":
        return b.assignees.length - a.assignees.length || label(a).localeCompare(label(b));
      case "primary":
        return Number(b.isPrimary) - Number(a.isPrimary) || label(a).localeCompare(label(b));
      case "sync": {
        const av = Number(Boolean(syncedById.get(a.repoId)));
        const bv = Number(Boolean(syncedById.get(b.repoId)));
        return bv - av || label(a).localeCompare(label(b));
      }
      default:
        return label(a).localeCompare(label(b));
    }
  };
}

function RepoFilterBar({
  query,
  onQuery,
  syncFilter,
  onSyncFilter,
  peopleFilter,
  onPeopleFilter,
  sort,
  onSort,
  shown,
  total,
}: {
  query: string;
  onQuery: (v: string) => void;
  syncFilter: SyncFilter;
  onSyncFilter: (v: SyncFilter) => void;
  peopleFilter: PeopleFilter;
  onPeopleFilter: (v: PeopleFilter) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search repositories"
          placeholder="Search repos by name or URL…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <FilterSelect
        aria-label="Filter by sync status"
        value={syncFilter}
        onChange={onSyncFilter}
        options={SYNC_OPTIONS}
      />
      <FilterSelect
        aria-label="Filter by assignees"
        value={peopleFilter}
        onChange={onPeopleFilter}
        options={PEOPLE_OPTIONS}
      />
      <FilterSelect
        aria-label="Sort repositories"
        value={sort}
        onChange={onSort}
        options={SORT_OPTIONS}
      />
      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
        {shown} of {total}
      </span>
    </div>
  );
}

/**
 * The project's git repositories and who works on each. Commit history from linked repos feeds
 * per-member skills and the project's Ask answers. A row opens a right-hand detail sheet; the
 * heavy sync setup (ingest keys + workflow) lives on the repo's own page, linked from the sheet.
 */
export function ProjectRepositoriesTab({
  project,
  manageable,
}: {
  project: ProjectDetail;
  manageable: boolean;
}) {
  const { data: repos } = useRepos();
  const syncedById = useMemo(
    () => new Map((repos ?? []).map((r) => [r.id, Boolean(r.ingestedAt)])),
    [repos],
  );

  const [query, setQuery] = useState("");
  const [syncFilter, setSyncFilter] = useState<SyncFilter>("all");
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [detailRepo, setDetailRepo] = useState<ProjectRepo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const hasRepos = project.repos.length > 0;
  const hasFilters = query.trim().length > 0 || syncFilter !== "all" || peopleFilter !== "all";

  function clearFilters() {
    setQuery("");
    setSyncFilter("all");
    setPeopleFilter("all");
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = project.repos.filter((r) =>
      repoMatches(r, q, syncFilter, peopleFilter, syncedById),
    );
    return [...filtered].sort(repoComparator(sort, syncedById));
  }, [project.repos, query, syncFilter, peopleFilter, sort, syncedById]);

  function openDetail(repo: ProjectRepo) {
    setDetailRepo(repo);
    setSheetOpen(true);
  }

  let body: React.ReactNode;
  if (!hasRepos) {
    body = (
      <EmptyState
        icon={GitBranchIcon}
        tone={manageable ? "honey" : "mist"}
        title="No repositories linked yet"
        description={
          manageable
            ? "Link your first repo to start building each member's skills and Ask answers."
            : "No repositories have been linked to this project yet."
        }
        action={manageable ? <LinkRepoDialog project={project} /> : undefined}
      />
    );
  } else if (visible.length === 0) {
    body = <FilteredEmpty noun="repositories" onClear={hasFilters ? clearFilters : undefined} />;
  } else {
    body = (
      <div role="list" className="overflow-hidden rounded-xl border border-border bg-card">
        {visible.map((r) => (
          <RepoRow
            key={r.repoId}
            projectId={project.id}
            repo={r}
            synced={Boolean(syncedById.get(r.repoId))}
            manageable={manageable}
            onOpen={() => openDetail(r)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        icon={GitBranchIcon}
        title="Repositories"
        description="Connect the repos this project ships. OwnBoard reads their commit history to build each member's real skills and to ground the project's Ask answers — it never needs access to your source code."
        action={manageable ? <LinkRepoDialog project={project} /> : undefined}
      />

      {hasRepos && (
        <RepoFilterBar
          query={query}
          onQuery={setQuery}
          syncFilter={syncFilter}
          onSyncFilter={setSyncFilter}
          peopleFilter={peopleFilter}
          onPeopleFilter={setPeopleFilter}
          sort={sort}
          onSort={setSort}
          shown={visible.length}
          total={project.repos.length}
        />
      )}

      {body}

      <RepoDetailSheet
        projectId={project.id}
        repo={detailRepo}
        manageable={manageable}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
