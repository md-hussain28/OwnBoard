"use client";

import { ProjectContextTab } from "@/components/project/project-context-tab";
import { ProjectContextView } from "@/components/project/project-context-view";
import { useProject } from "@/hooks/queries/project/project.queries";

export function ProjectContextViewPage({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;

  // Managers edit the reference context; members get the read-only orientation view.
  return project.canManage ? (
    <ProjectContextTab project={project} />
  ) : (
    <ProjectContextView project={project} />
  );
}
