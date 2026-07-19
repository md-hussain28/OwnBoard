"use client";

import { CheckCircle2Icon, ChevronRightIcon, GitBranchIcon } from "lucide-react";
import { useState } from "react";
import { DraftLink, EmptyState, LoadingPun } from "@/components/shared";
import { useAppRole } from "@/hooks/queries/me";
import { useCreateRepo, useRepos } from "@/hooks/queries/repo";
import { appPath, notify } from "@/lib";
import { getApiErrorMessage } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Spinner,
} from "@/ui";
import { repoSlug } from "./repo-identity";

export function ConnectedReposList() {
  const { isAdmin } = useAppRole();
  const { data: repos, isLoading, isError, error } = useRepos();
  const createRepo = useCreateRepo();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!url || !name) return;
    createRepo.mutate(
      { url, name },
      {
        onSuccess: (repo) => {
          setUrl("");
          setName("");
          notify.success("Repo connected", {
            description: repo.name,
            id: `repo:${repo.id}`,
          });
        },
        onError: (err) => {
          notify.apiError(err, "Could not add repo", { id: "repo-create-error" });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected repos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Repo name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Repo URL" value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button type="submit" disabled={createRepo.isPending}>
              {createRepo.isPending && <Spinner />}
              {createRepo.isPending ? "Adding..." : "Add repo"}
            </Button>
          </form>
        )}

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <LoadingPun className="justify-start text-xs" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not reach the backend ({getApiErrorMessage(error)}). Start the FastAPI service and
            refresh.
          </p>
        )}

        {!isLoading && !isError && repos?.length === 0 && (
          <EmptyState
            icon={GitBranchIcon}
            tone="mist"
            compact
            bordered={false}
            title="No repos connected yet"
            description={isAdmin ? undefined : "Ask an admin to add one."}
          />
        )}

        {!isLoading && !isError && repos && repos.length > 0 && (
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {repos.map((repo) => (
              <li key={repo.id} className="border-b border-border last:border-0">
                <DraftLink
                  entityId={repo.id}
                  href={appPath("repos", repo.id)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal-soft text-brand-teal">
                    <GitBranchIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{repo.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {repoSlug(repo.url) ?? repo.url}
                    </p>
                  </div>
                  {repo.ingestedAt ? (
                    <Badge className="gap-1 bg-brand-moss-soft text-brand-moss">
                      <CheckCircle2Icon className="size-3" /> Synced
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not synced</Badge>
                  )}
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </DraftLink>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
