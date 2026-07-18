"use client";

import { useUser } from "@clerk/nextjs";
import { useMemo } from "react";
import {
  useAssignmentOutcomes,
  useCohortDashboard,
} from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { useProjects } from "@/hooks/queries/project/project.queries";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { useExpertiseScores } from "@/hooks/queries/skill-graph/skill-graph.queries";
import { subsystemRisks } from "@/lib/skill-graph";
import { Skeleton } from "@/ui/skeleton";
import { buildAttention, NeedsAttention } from "./admin/needs-attention";
import { ProjectsSection } from "./admin/projects-section";
import { RiskHighlight } from "./admin/risk-highlight";
import { SetupWalkthrough } from "./admin/setup-walkthrough";
import { statusLine } from "./admin/status";
import { SummaryTiles } from "./admin/summary-tiles";
import { firstNameOf, HomeGreeting } from "./home-primitives";

export function AdminHome() {
  const { user } = useUser();
  const name = firstNameOf(user?.firstName ?? user?.fullName);

  const cohortQuery = useCohortDashboard();
  const outcomesQuery = useAssignmentOutcomes();
  const projectsQuery = useProjects();
  const reposQuery = useRepos();
  const repo = reposQuery.data?.[0];
  const expertiseQuery = useExpertiseScores(repo?.id ?? "");

  const risks = useMemo(() => subsystemRisks(expertiseQuery.data ?? []), [expertiseQuery.data]);
  const highRisks = useMemo(() => risks.filter((r) => r.riskLevel === "high"), [risks]);
  const topRisk = highRisks[0];

  const cohort = cohortQuery.data;
  const status = statusLine(cohort, highRisks.length);

  const attention = useMemo(
    () => buildAttention(cohort, outcomesQuery.data ?? [], topRisk),
    [cohort, outcomesQuery.data, topRisk],
  );

  // Brand new: no projects and no repos connected yet.
  const isBrandNew =
    !projectsQuery.isLoading &&
    !reposQuery.isLoading &&
    (projectsQuery.data?.length ?? 0) === 0 &&
    (reposQuery.data?.length ?? 0) === 0;

  const summaryLoading = cohortQuery.isLoading || reposQuery.isLoading || expertiseQuery.isLoading;
  const attentionLoading = cohortQuery.isLoading || outcomesQuery.isLoading;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <HomeGreeting name={name} line={status} loading={cohortQuery.isLoading} />

      {isBrandNew ? (
        <SetupWalkthrough
          hasRepo={(reposQuery.data?.length ?? 0) > 0}
          hasProject={(projectsQuery.data?.length ?? 0) > 0}
        />
      ) : (
        <>
          {summaryLoading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : (
            cohort && <SummaryTiles cohort={cohort} highRiskCount={highRisks.length} />
          )}

          <NeedsAttention items={attention} loading={attentionLoading} />

          {topRisk && repo && <RiskHighlight topRisk={topRisk} />}

          <ProjectsSection />
        </>
      )}
    </div>
  );
}
