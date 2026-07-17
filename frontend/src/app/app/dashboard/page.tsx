"use client";

import { BusFactorHeatmap } from "@/components/dashboard/bus-factor-heatmap";
import { QuizAnalyticsCard } from "@/components/dashboard/quiz-analytics-card";
import { IncomingBadge } from "@/components/layout/incoming-feature";
import { DEMO_REPO_ID } from "@/constants/app";
import { useRepos } from "@/hooks/queries/repo/repo.queries";

export default function DashboardPage() {
  const { data: repos } = useRepos();
  const repoId = repos?.[0]?.id ?? DEMO_REPO_ID;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Skill graph</h1>
          <IncomingBadge />
        </div>
        <p className="text-muted-foreground">
          Bus-factor concentration risk and quiz outcomes per subsystem.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BusFactorHeatmap repoId={repoId} />
        <QuizAnalyticsCard repoId={repoId} />
      </div>
    </div>
  );
}
