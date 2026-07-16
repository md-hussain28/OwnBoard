"use client";

import { useState } from "react";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { useCreateRepo } from "@/hooks/queries/repo/repo.mutations";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { Badge } from "@/ui/badge";
import { getApiErrorMessage } from "@/lib/api/errors";

export function ConnectedReposList() {
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
        onSuccess: () => {
          setUrl("");
          setName("");
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Repo name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Repo URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button type="submit" disabled={createRepo.isPending}>
            {createRepo.isPending ? "Adding..." : "Add repo"}
          </Button>
        </form>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not reach the backend ({getApiErrorMessage(error)}).
            Start the FastAPI service and refresh.
          </p>
        )}

        {!isLoading && !isError && repos?.length === 0 && (
          <p className="text-sm text-muted-foreground">No repos connected yet.</p>
        )}

        {!isLoading && !isError && repos && repos.length > 0 && (
          <ul className="space-y-2">
            {repos.map((repo) => (
              <li
                key={repo.id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-shadow duration-200 hover:shadow-soft"
              >
                <div>
                  <p className="font-medium">{repo.name}</p>
                  <p className="text-sm text-muted-foreground">{repo.url}</p>
                </div>
                <Badge variant={repo.ingestedAt ? "default" : "secondary"}>
                  {repo.ingestedAt ? "Ingested" : "Pending"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
