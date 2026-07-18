"use client";

import Link from "next/link";
import { ConnectRepoPrompt } from "@/components/repo/connect-repo-prompt";
import {
  RiskiestFiles,
  SubsystemBusFactor,
  TopContributors,
} from "@/components/skill-graph/skill-graph-panels";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { appPath } from "@/lib/routes";
import { Skeleton } from "@/ui/skeleton";

export default function DashboardPage() {
  const { data: repos, isLoading } = useRepos();
  const repo = repos?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Skill graph</h1>
        <p className="text-muted-foreground">
          Who built what, and where knowledge is dangerously concentrated — inferred from git
          history, not self-reported.
        </p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}
      {!isLoading && !repo && <ConnectRepoPrompt />}

      {repo && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <Link
              href={appPath("repos", repo.id)}
              className="font-medium text-foreground underline"
            >
              {repo.name}
            </Link>
            .
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <SubsystemBusFactor repoId={repo.id} />
            <TopContributors repoId={repo.id} />
          </div>
          <RiskiestFiles repoId={repo.id} />
        </>
      )}
    </div>
  );
}
