"use client";

import {
  CheckCircle2Icon,
  CheckIcon,
  CircleAlertIcon,
  GitBranchIcon,
  Link2Icon,
  MoreVerticalIcon,
  PanelRightOpenIcon,
  PlugZapIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { repoSlug } from "@/components/repo";
import { ConfirmDialog, EmptyState, FilteredEmpty, FilterSelect } from "@/components/shared";
import { useAddProjectRepo, useRemoveProjectRepo } from "@/hooks/queries/project";
import { useRepos } from "@/hooks/queries/repo";
import { cn, notify } from "@/lib";
import type { ProjectDetail, ProjectRepo } from "@/schemas";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Spinner,
} from "@/ui";
import { ProjectSectionHeader } from "./project-section-header";
import { RepoDetailSheet } from "./repo-detail-sheet";
import { RepoMembersDialog } from "./repo-members-dialog";

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
    const filtered = project.repos.filter((r) => {
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
    });

    const label = (r: ProjectRepo) => (r.name ?? repoSlug(r.url) ?? r.repoId).toLowerCase();
    return [...filtered].sort((a, b) => {
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
    });
  }, [project.repos, query, syncFilter, peopleFilter, sort, syncedById]);

  function openDetail(repo: ProjectRepo) {
    setDetailRepo(repo);
    setSheetOpen(true);
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search repositories"
              placeholder="Search repos by name or URL…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <FilterSelect
            aria-label="Filter by sync status"
            value={syncFilter}
            onChange={setSyncFilter}
            options={SYNC_OPTIONS}
          />
          <FilterSelect
            aria-label="Filter by assignees"
            value={peopleFilter}
            onChange={setPeopleFilter}
            options={PEOPLE_OPTIONS}
          />
          <FilterSelect
            aria-label="Sort repositories"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
          />
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
            {visible.length} of {project.repos.length}
          </span>
        </div>
      )}

      {!hasRepos ? (
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
      ) : visible.length === 0 ? (
        <FilteredEmpty noun="repositories" onClear={hasFilters ? clearFilters : undefined} />
      ) : (
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
      )}

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

/** One repo as a scannable, clickable table row: identity · assignees · sync state + a `⋯` menu. */
function RepoRow({
  projectId,
  repo,
  synced,
  manageable,
  onOpen,
}: {
  projectId: string;
  repo: ProjectRepo;
  synced: boolean;
  manageable: boolean;
  onOpen: () => void;
}) {
  const removeRepo = useRemoveProjectRepo(projectId);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const label = repo.name ?? repoSlug(repo.url) ?? repo.repoId;

  function handleRemove() {
    removeRepo.mutate(repo.repoId, {
      onSuccess: () => {
        setConfirmOpen(false);
        notify.success("Repo removed", { description: label });
      },
      onError: (err) => notify.apiError(err, "Could not remove repo"),
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
    >
      {/* Identity */}
      <div className="flex min-w-0 flex-[2] items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal-soft text-brand-teal">
          <GitBranchIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <span className="truncate">{label}</span>
            {repo.isPrimary && (
              <Badge variant="outline" className="shrink-0 gap-1">
                <StarIcon className="size-3" /> Primary
              </Badge>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {repoSlug(repo.url) ?? repo.repoId}
          </p>
        </div>
      </div>

      {/* Assignees */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {repo.assignees.length === 0 ? (
          <span className="text-xs text-muted-foreground">No one assigned</span>
        ) : (
          repo.assignees.map((a) => (
            <Badge key={a.employeeId} variant="secondary">
              {a.name}
            </Badge>
          ))
        )}
      </div>

      {/* Sync state + actions */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {synced ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2Icon className="size-3" /> Synced
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <PlugZapIcon className="size-3" /> Not synced
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${label}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onOpen()}>
              <PanelRightOpenIcon /> View details
            </DropdownMenuItem>
            {manageable && (
              <DropdownMenuItem onSelect={() => setPeopleOpen(true)}>
                <UsersIcon /> Manage people
              </DropdownMenuItem>
            )}
            {manageable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    // Keep the confirm modal from racing the menu's close/focus handoff.
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                >
                  <Trash2Icon /> Remove from project
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Manager-only affordances, driven by the menu (rendered here so row clicks don't reach them) */}
      {manageable && (
        <div onClick={(e) => e.stopPropagation()}>
          <RepoMembersDialog
            projectId={projectId}
            repo={repo}
            open={peopleOpen}
            onOpenChange={setPeopleOpen}
          />
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Remove this repository?"
            description={
              <>
                <span className="font-medium text-foreground">{label}</span> will be unlinked from
                this project. Its imported commit history and any skills already derived from it are
                kept — you can link it again later.
              </>
            }
            confirmLabel="Remove repo"
            pending={removeRepo.isPending}
            onConfirm={handleRemove}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Link a repo by pasting its URL. (Choosing from an existing org-connected repo used to live here
 * too, but it added a second, rarely-used path — linking by URL de-dupes on the backend anyway.)
 */
function LinkRepoDialog({ project }: { project: ProjectDetail }) {
  const addRepo = useAddProjectRepo(project.id);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const firstRepo = project.repos.length === 0;
  // First repo is the project's primary by definition; after that it's the linker's call.
  const [isPrimary, setIsPrimary] = useState(false);

  const trimmedUrl = url.trim();
  const slug = repoSlug(trimmedUrl);
  // A usable git URL: recognisable host + an org/repo slug. We stay lenient (self-hosted
  // GitLab/Bitbucket are fine) but flag input that clearly isn't a repo URL yet.
  const looksLikeUrl =
    /^(https?:\/\/|git@)/i.test(trimmedUrl) || /[^/\s]+\/[^/\s]+/.test(trimmedUrl);
  const showUrlWarning = trimmedUrl.length > 0 && !looksLikeUrl;
  // The repo half of "org/repo" makes a good default name when the linker leaves it blank.
  const suggestedName = slug?.split("/").pop() ?? "";

  function reset() {
    setUrl("");
    setName("");
    setIsPrimary(false);
  }

  function handleOpen(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  const canSubmit = trimmedUrl.length > 0 && looksLikeUrl;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    addRepo.mutate(
      {
        url: trimmedUrl,
        name: name.trim() || suggestedName || null,
        isPrimary: firstRepo || isPrimary,
      },
      {
        onSuccess: () => {
          handleOpen(false);
          notify.success("Repo linked");
        },
        onError: (err) => notify.apiError(err, "Could not link repo"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>
          <Link2Icon className="size-4" /> Link repository
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Link a repository</DialogTitle>
            <DialogDescription>
              Point this project at a repo it ships. OwnBoard reads its commit history to build
              skills and ground Ask answers — it never needs access to your source code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="repo-url">
                Repo URL
              </label>
              <Input
                id="repo-url"
                placeholder="https://github.com/org/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-invalid={showUrlWarning}
                autoFocus
              />
              {showUrlWarning ? (
                <p className="flex items-center gap-1.5 text-xs text-brand-coral">
                  <CircleAlertIcon className="size-3.5 shrink-0" />
                  That doesn't look like a repository URL yet.
                </p>
              ) : slug ? (
                <p className="flex items-center gap-1.5 text-xs text-brand-teal">
                  <CheckIcon className="size-3.5 shrink-0" />
                  Detected <span className="font-medium">{slug}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Paste an HTTPS or SSH URL from GitHub, GitLab, or Bitbucket.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="repo-name">
                Display name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="repo-name"
                placeholder={suggestedName || "repo"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {suggestedName
                  ? `Leave blank to use “${suggestedName}”.`
                  : "How this repo shows up across the project."}
              </p>
            </div>

            {/* Primary repo — a real backend field (is_primary). The first linked repo is
                always primary; after that the linker opts in. */}
            <button
              type="button"
              role="checkbox"
              aria-checked={firstRepo || isPrimary}
              disabled={firstRepo}
              onClick={() => setIsPrimary((v) => !v)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                firstRepo || isPrimary
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:bg-muted/50",
                firstRepo && "cursor-default opacity-90",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                  firstRepo || isPrimary
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input",
                )}
              >
                {(firstRepo || isPrimary) && <CheckIcon className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <StarIcon className="size-3.5 text-brand-honey" />
                  Set as primary repo
                </span>
                <span className="block text-xs text-muted-foreground">
                  {firstRepo
                    ? "Your first repo is the project's primary automatically."
                    : "The default repo for this project's codebase quizzes and Ask answers."}
                </span>
              </span>
            </button>

            <p className="text-xs text-muted-foreground">You'll set up sync after linking.</p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || addRepo.isPending}>
              {addRepo.isPending && <Spinner />} Link repository
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
