"use client";

import { redirect } from "next/navigation";
import { projectSectionPath } from "@/components/layout";
import { ProjectNeedsRepo, primaryProjectRepoId } from "@/components/project";
import { RiskiestFiles, SubsystemBusFactor, TopContributors } from "@/components/skill-graph";
import { useProject } from "@/hooks/queries/project";

export function ProjectSkillGraphView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;
  // Skill graph / bus-factor is a manager-only analytics surface.
  if (!project.canManage) redirect(projectSectionPath(project.id, ""));

  const repoId = primaryProjectRepoId(project);
  if (!repoId) return <ProjectNeedsRepo projectId={project.id} canManage={project.canManage} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Who built what, and where knowledge is dangerously concentrated — inferred from git history,
        not self-reported.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <SubsystemBusFactor repoId={repoId} />
        <TopContributors repoId={repoId} />
      </div>
      <RiskiestFiles repoId={repoId} />
    </div>
  );
}
