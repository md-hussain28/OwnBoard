"use client";

import { UsersIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { projectSectionPath } from "@/components/layout";
import { AddMembersDialog, ProjectMemberPanel, ProjectSectionHeader } from "@/components/project";
import { useProject } from "@/hooks/queries/project";

export function ProjectMembersView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;
  // Member management is a manager-only surface; employees are sent back to Overview.
  if (!project.canManage) redirect(projectSectionPath(project.id, ""));

  return (
    <div className="space-y-4" data-tour="project-panel-members">
      <ProjectSectionHeader
        icon={UsersIcon}
        title="Members"
        description="Everyone on this project, their role and onboarding progress. Add teammates and set a team lead."
        action={<AddMembersDialog projectId={project.id} />}
      />
      <ProjectMemberPanel projectId={project.id} manageable />
    </div>
  );
}
