"use client";

import { ConnectRepoPrompt } from "@/components/repo";
import { DraftLink } from "@/components/shared";
import { RiskiestFiles, SubsystemBusFactor, TopContributors } from "@/components/skill-graph";
import { useRepos } from "@/hooks/queries/repo";
import { appPath } from "@/lib";
import { Skeleton } from "@/ui";

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
            <DraftLink
              entityId={repo.id}
              href={appPath("repos", repo.id)}
              className="font-medium text-foreground underline"
            >
              {repo.name}
            </DraftLink>
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
