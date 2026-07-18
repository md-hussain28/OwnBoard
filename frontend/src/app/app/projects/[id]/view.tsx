"use client";

import { ProjectHubHeader } from "@/components/project/project-hub-header";
import { ProjectOverviewTab } from "@/components/project/project-overview-tab";
import { useProject } from "@/hooks/queries/project/project.queries";

export function ProjectOverviewView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  // Layout gates access; a cached project resolves instantly here.
  if (!project) return null;
  return (
    <div className="space-y-6">
      <ProjectHubHeader project={project} />
      <ProjectOverviewTab project={project} />
    </div>
  );
}
