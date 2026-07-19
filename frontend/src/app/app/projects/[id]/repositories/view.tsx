"use client";

import { redirect } from "next/navigation";
import { projectSectionPath } from "@/components/layout";
import { ProjectRepositoriesTab } from "@/components/project";
import { PageTourNudge } from "@/components/tour";
import { useProject } from "@/hooks/queries/project";

export function ProjectRepositoriesView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;
  // Connecting/syncing repos is a manager-only surface.
  if (!project.canManage) redirect(projectSectionPath(project.id, ""));

  return (
    <div className="space-y-4" data-tour="project-panel-repositories">
      <PageTourNudge featureId="project-repos" />
      <ProjectRepositoriesTab project={project} manageable />
    </div>
  );
}
