"use client";

import { UsersIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { projectSectionPath } from "@/components/layout/nav-config";
import { AddMembersDialog } from "@/components/project/add-members-dialog";
import { ProjectMemberPanel } from "@/components/project/project-member-panel";
import { ProjectSectionHeader } from "@/components/project/project-section-header";
import { useProject } from "@/hooks/queries/project/project.queries";

export function ProjectMembersView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;
  // Member management is a manager-only surface; employees are sent back to Overview.
  if (!project.canManage) redirect(projectSectionPath(project.id, ""));

  return (
    <div className="space-y-4">
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
