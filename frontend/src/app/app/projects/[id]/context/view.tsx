"use client";

import { ProjectContextTab, ProjectContextView } from "@/components/project";
import { useProject } from "@/hooks/queries/project";

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
