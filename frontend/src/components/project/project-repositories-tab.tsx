"use client";

import {
  ArrowRightIcon,
  CheckCircle2Icon,
  GitBranchIcon,
  Link2Icon,
  PlugZapIcon,
  StarIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAddProjectRepo, useRemoveProjectRepo } from "@/hooks/queries/project/project.mutations";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { appPath } from "@/lib/routes";
import { notify } from "@/lib/toast";
import type { ProjectDetail, ProjectRepo } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Spinner } from "@/ui/spinner";
import { ProjectSectionHeader } from "./project-section-header";
import { RepoMembersDialog } from "./repo-members-dialog";

const ADD_URL = "__url__";

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
      />

      <HowItWorks />

      {project.repos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-honey-soft text-brand-honey">
              <GitBranchIcon className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              {manageable
                ? "No repositories linked yet — link your first one below to get started."
                : "No repositories have been linked to this project yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {project.repos.map((r) => (
            <RepoCard
              key={r.repoId}
              projectId={project.id}
              repo={r}
              synced={Boolean(syncedById.get(r.repoId))}
              manageable={manageable}
            />
          ))}
        </div>
      )}

      {manageable && <LinkRepoControl project={project} />}
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

function RepoCard({
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
  return (
    <Card className="transition-shadow hover:shadow-soft">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={appPath("repos", repo.repoId)} className="group min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium">
              {repo.name ?? repo.url ?? repo.repoId}
              {repo.isPrimary && (
                <Badge variant="outline">
                  <StarIcon className="size-3" /> Primary
                </Badge>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{repo.url ?? repo.repoId}</p>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {synced ? (
              <Badge className="bg-brand-moss-soft text-brand-moss">Synced</Badge>
            ) : (
              <Badge variant="outline">Not synced</Badge>
            )}
            {manageable && <RemoveRepoButton projectId={projectId} repoId={repo.repoId} />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          {repo.assignees.length === 0 ? (
            <span className="text-xs text-muted-foreground">No one assigned yet</span>
          ) : (
            repo.assignees.map((a) => (
              <Badge key={a.employeeId} variant="secondary">
                {a.name}
              </Badge>
            ))
          )}
          {manageable && (
            <div className="ml-auto">
              <RepoMembersDialog projectId={projectId} repo={repo} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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

function LinkRepoControl({ project }: { project: ProjectDetail }) {
  const { data: repos } = useRepos();
  const addRepo = useAddProjectRepo(project.id);
  const [choice, setChoice] = useState<string>("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const linkedIds = new Set(project.repos.map((r) => r.repoId));
  const available = (repos ?? []).filter((r) => !linkedIds.has(r.id));
  const firstRepo = project.repos.length === 0;

  function handleAdd() {
    if (choice === ADD_URL) {
      if (!url.trim()) return;
      addRepo.mutate(
        { url: url.trim(), name: name.trim() || null, isPrimary: firstRepo },
        {
          onSuccess: () => {
            setUrl("");
            setName("");
            setChoice("");
            notify.success("Repo linked");
          },
          onError: (err) => notify.apiError(err, "Could not link repo"),
        },
      );
      return;
    }
    if (!choice) return;
    addRepo.mutate(
      { repoId: choice, isPrimary: firstRepo },
      {
        onSuccess: () => {
          setChoice("");
          notify.success("Repo linked");
        },
        onError: (err) => notify.apiError(err, "Could not link repo"),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Link a repo</label>
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a repo…" />
              </SelectTrigger>
              <SelectContent>
                {available.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
                <SelectItem value={ADD_URL}>+ New repo by URL…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {choice !== ADD_URL && (
            <Button onClick={handleAdd} disabled={!choice || addRepo.isPending}>
              {addRepo.isPending && <Spinner />} Link
            </Button>
          )}
        </div>

        {choice === ADD_URL && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Repo URL</label>
              <Input
                placeholder="https://github.com/org/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="min-w-32 flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name (optional)</label>
              <Input placeholder="repo" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={handleAdd} disabled={!url.trim() || addRepo.isPending}>
              {addRepo.isPending && <Spinner />} Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
