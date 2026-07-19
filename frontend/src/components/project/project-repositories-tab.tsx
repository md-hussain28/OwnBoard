"use client";

import {
  CheckCircle2Icon,
  GitBranchIcon,
  Link2Icon,
  PlugZapIcon,
  StarIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { repoSlug } from "@/components/repo";
import { DraftLink, EmptyState } from "@/components/shared";
import { useAddProjectRepo, useRemoveProjectRepo } from "@/hooks/queries/project";
import { useRepos } from "@/hooks/queries/repo";
import { appPath, notify } from "@/lib";
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from "@/ui";
import { ProjectSectionHeader } from "./project-section-header";
import { RepoMembersDialog } from "./repo-members-dialog";

/**
 * The project's git repositories and who works on each. Commit history from linked repos feeds
 * per-member skills and the project's Ask answers.
 */
export function ProjectRepositoriesTab({
  project,
  manageable,
}: {
  project: ProjectDetail;
  manageable: boolean;
}) {
  const { data: repos } = useRepos();
  const syncedById = new Map((repos ?? []).map((r) => [r.id, Boolean(r.ingestedAt)]));

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        icon={GitBranchIcon}
        title="Repositories"
        description="Connect the repos this project ships. OwnBoard reads their commit history to build each member's real skills and to ground the project's Ask answers — it never needs access to your source code."
        action={manageable ? <LinkRepoDialog project={project} /> : undefined}
      />

      <HowItWorks />

      {project.repos.length === 0 ? (
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
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          {project.repos.map((r) => (
            <RepoRow
              key={r.repoId}
              projectId={project.id}
              repo={r}
              synced={Boolean(syncedById.get(r.repoId))}
              manageable={manageable}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** The three-step pipeline, spelled out so a manager knows what this page is for and in what order. */
function HowItWorks() {
  const steps = [
    {
      icon: Link2Icon,
      title: "Link",
      body: "Point this project at each repo it ships.",
    },
    {
      icon: PlugZapIcon,
      title: "Sync",
      body: "A one-time GitHub Action imports commit history.",
    },
    {
      icon: UsersIcon,
      title: "Assign",
      body: "Tag who works on each repo to keep skills accurate.",
    },
  ];
  return (
    <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:grid-cols-3">
      {steps.map((s, i) => (
        <div key={s.title} className="flex items-start gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey">
            <s.icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground">{i + 1}.</span> {s.title}
            </p>
            <p className="text-xs text-muted-foreground">{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One repo as a scannable table row: identity · assignees · sync state + actions. */
function RepoRow({
  projectId,
  repo,
  synced,
  manageable,
}: {
  projectId: string;
  repo: ProjectRepo;
  synced: boolean;
  manageable: boolean;
}) {
  const detailHref = appPath("projects", projectId, "repositories", repo.repoId);

  // Getting a repo synced is the whole point of linking it — surface the next action, not just a status.
  let syncControl: React.ReactNode;
  if (synced) {
    syncControl = (
      <Button asChild size="sm" variant="ghost">
        <DraftLink entityId={repo.repoId} href={detailHref}>
          <CheckCircle2Icon className="size-3.5 text-brand-moss" /> Synced
        </DraftLink>
      </Button>
    );
  } else if (manageable) {
    syncControl = (
      <Button asChild size="sm" variant="outline">
        <DraftLink entityId={repo.repoId} href={detailHref}>
          <PlugZapIcon className="size-4" /> Set up sync
        </DraftLink>
      </Button>
    );
  } else {
    syncControl = <Badge variant="outline">Not synced</Badge>;
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 last:border-0">
      {/* Identity */}
      <div className="flex min-w-0 flex-[2] items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal-soft text-brand-teal">
          <GitBranchIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <span className="truncate">{repo.name ?? repoSlug(repo.url) ?? repo.repoId}</span>
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
        {syncControl}
        {manageable && <RepoMembersDialog projectId={projectId} repo={repo} />}
        {manageable && <RemoveRepoButton projectId={projectId} repoId={repo.repoId} />}
      </div>
    </li>
  );
}

function RemoveRepoButton({ projectId, repoId }: { projectId: string; repoId: string }) {
  const removeRepo = useRemoveProjectRepo(projectId);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Remove repo"
      onClick={() =>
        removeRepo.mutate(repoId, {
          onError: (err) => notify.apiError(err, "Could not remove repo"),
        })
      }
    >
      <XIcon className="size-4" />
    </Button>
  );
}

/**
 * Link a repo without cluttering the tab: a button in the section header opens this modal, which
 * offers the two ways to link, each spelled out instead of hidden behind a mode-switching dropdown
 * — pick one your org already connected, or paste a new URL. Either way you set up sync afterward.
 * Selecting an existing repo and typing a URL are mutually exclusive, so the single footer action
 * is never ambiguous.
 */
function LinkRepoDialog({ project }: { project: ProjectDetail }) {
  const { data: repos } = useRepos();
  const addRepo = useAddProjectRepo(project.id);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const linkedIds = new Set(project.repos.map((r) => r.repoId));
  const available = (repos ?? []).filter((r) => !linkedIds.has(r.id));
  const firstRepo = project.repos.length === 0;

  function reset() {
    setChoice("");
    setUrl("");
    setName("");
  }

  function handleOpen(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  // Picking an existing repo and typing a new URL are two different intents — keep only one live.
  function pickExisting(id: string) {
    setChoice(id);
    setUrl("");
    setName("");
  }
  function typeUrl(value: string) {
    setUrl(value);
    if (value) setChoice("");
  }

  const canSubmit = Boolean(choice) || url.trim().length > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    const payload = choice
      ? { repoId: choice, isPrimary: firstRepo }
      : { url: url.trim(), name: name.trim() || null, isPrimary: firstRepo };
    addRepo.mutate(payload, {
      onSuccess: () => {
        handleOpen(false);
        notify.success("Repo linked");
      },
      onError: (err) => notify.apiError(err, "Could not link repo"),
    });
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
            {/* Path 1 — an existing org repo. Hidden entirely when there are none left to link. */}
            {available.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Already connected to your org</label>
                <Select value={choice} onValueChange={pickExisting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a repo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {available.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or add a new one
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            {/* Path 2 — a brand-new repo by URL. */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="repo-url">
                Repo URL
              </label>
              <Input
                id="repo-url"
                placeholder="https://github.com/org/repo"
                value={url}
                onChange={(e) => typeUrl(e.target.value)}
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
                disabled={Boolean(choice)}
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
