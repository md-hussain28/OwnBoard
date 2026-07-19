"use client";

import {
  CheckCircle2Icon,
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
import { notify } from "@/lib";
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

const SYNC_OPTIONS: { value: SyncFilter; label: string }[] = [
  { value: "all", label: "All repos" },
  { value: "synced", label: "Synced" },
  { value: "unsynced", label: "Not synced" },
];

/**
 * The project's git repositories and who works on each. Commit history from linked repos feeds
 * per-member skills and the project's Ask answers. A row opens a right-hand detail sheet — the
 * single detail surface (there's no separate detail page for a repo inside a project anymore).
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
  const [detailRepo, setDetailRepo] = useState<ProjectRepo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const hasRepos = project.repos.length > 0;
  const hasFilters = query.trim().length > 0 || syncFilter !== "all";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return project.repos.filter((r) => {
      if (q) {
        const hay = `${r.name ?? ""} ${r.url ?? ""} ${repoSlug(r.url) ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const synced = Boolean(syncedById.get(r.repoId));
      if (syncFilter === "synced" && !synced) return false;
      if (syncFilter === "unsynced" && synced) return false;
      return true;
    });
  }, [project.repos, query, syncFilter, syncedById]);

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
        <FilteredEmpty
          noun="repositories"
          onClear={
            hasFilters
              ? () => {
                  setQuery("");
                  setSyncFilter("all");
                }
              : undefined
          }
        />
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

  function reset() {
    setUrl("");
    setName("");
  }

  function handleOpen(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  const canSubmit = url.trim().length > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    addRepo.mutate(
      { url: url.trim(), name: name.trim() || null, isPrimary: firstRepo },
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
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="repo-name">
                Name (optional)
              </label>
              <Input
                id="repo-name"
                placeholder="repo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
