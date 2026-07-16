"use client";

import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { BusFactorHeatmap } from "@/components/dashboard/bus-factor-heatmap";
import { QuizAnalyticsCard } from "@/components/dashboard/quiz-analytics-card";
import { DEMO_REPO_ID } from "@/constants/app";

export default function DashboardPage() {
  const { data: repos } = useRepos();
  const repoId = repos?.[0]?.id ?? DEMO_REPO_ID;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Engineering manager dashboard</h1>
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
