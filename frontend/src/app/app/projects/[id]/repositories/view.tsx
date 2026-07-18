"use client";

import { redirect } from "next/navigation";
import { projectSectionPath } from "@/components/layout/nav-config";
import { ProjectRepositoriesTab } from "@/components/project/project-repositories-tab";
import { useProject } from "@/hooks/queries/project/project.queries";

export function ProjectRepositoriesView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;
  // Connecting/syncing repos is a manager-only surface.
  if (!project.canManage) redirect(projectSectionPath(project.id, ""));

  return <ProjectRepositoriesTab project={project} manageable />;
}
