"use client";

import { ArrowRightIcon, GitBranchIcon, StarIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAddProjectRepo, useRemoveProjectRepo } from "@/hooks/queries/project/project.mutations";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { appPath } from "@/lib/routes";
import { notify } from "@/lib/toast";
import type { ProjectDetail } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Spinner } from "@/ui/spinner";

const ADD_URL = "__url__";

/**
 * The project's git repositories — where its skill graph, experts, and archaeology
 * Q&A get their evidence. Connecting a repo makes those sub-nav sections light up.
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
      <p className="text-sm text-muted-foreground">
        Connect a repo to build its skill graph from git history — no source access required. The
        primary repo powers the Skill graph, Who to ask, and Ask project sections.
      </p>

      {project.repos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-honey-soft text-brand-honey">
              <GitBranchIcon className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              {manageable
                ? "No repositories linked yet. Link one below to unlock this project's codebase intelligence."
                : "No repositories have been linked to this project yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {project.repos.map((r) => (
            <Card key={r.repoId} className="transition-shadow hover:shadow-soft">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <Link href={appPath("repos", r.repoId)} className="group min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    {r.name ?? r.url ?? r.repoId}
                    {r.isPrimary && (
                      <Badge variant="outline">
                        <StarIcon className="size-3" /> Primary
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{r.url ?? r.repoId}</p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  {syncedById.get(r.repoId) ? (
                    <Badge className="bg-brand-moss-soft text-brand-moss">Synced</Badge>
                  ) : (
                    <Badge variant="outline">Not synced</Badge>
                  )}
                  {manageable ? (
                    <RemoveRepoButton projectId={project.id} repoId={r.repoId} />
                  ) : (
                    <Link href={appPath("repos", r.repoId)}>
                      <ArrowRightIcon className="size-4 text-muted-foreground" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {manageable && <LinkRepoControl project={project} />}
    </div>
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
