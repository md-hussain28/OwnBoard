"use client";

import { ArrowRightIcon, GitBranchIcon } from "lucide-react";
import Link from "next/link";
import { ConnectRepoDialog } from "@/components/repo";
import { EmptyState, QueryState } from "@/components/shared";
import { useAppRole } from "@/hooks/queries/me";
import { useRepos } from "@/hooks/queries/repo";
import { appPath } from "@/lib";
import { Badge, Card, CardContent } from "@/ui";

export default function ReposPage() {
  const { isAdmin } = useAppRole();
  const { data: repos, isLoading, isError, error } = useRepos();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Repositories</h1>
          <p className="text-muted-foreground">
            Connect a repo to build its skill graph from git history — no code access required.
          </p>
        </div>
        {isAdmin && <ConnectRepoDialog />}
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(repos ?? []).length === 0}
        empty={
          <EmptyState
            icon={GitBranchIcon}
            tone={isAdmin ? "honey" : "mist"}
            title="No repositories yet"
            description={
              isAdmin
                ? "Connect one to build its skill graph from git history."
                : "No repositories have been connected yet."
            }
            action={isAdmin ? <ConnectRepoDialog /> : undefined}
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(repos ?? []).map((repo) => (
            <Link key={repo.id} href={appPath("repos", repo.id)} className="group">
              <Card className="transition-shadow group-hover:shadow-soft">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{repo.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{repo.url}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {repo.ingestedAt ? (
                      <Badge className="bg-brand-moss-soft text-brand-moss">Synced</Badge>
                    ) : (
                      <Badge variant="outline">Not synced</Badge>
                    )}
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
