"use client";

import { redirect, useParams } from "next/navigation";
import { projectSectionPath } from "@/components/layout/nav-config";
import { AddMembersDialog } from "@/components/project/add-members-dialog";
import { ProjectMemberPanel } from "@/components/project/project-member-panel";
import { useProject } from "@/hooks/queries/project/project.queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

export default function ProjectMembersPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id);
  if (!project) return null;
  // Member management is a manager-only surface; employees are sent back to Overview.
  if (!project.canManage) redirect(projectSectionPath(project.id, ""));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Members</CardTitle>
        <AddMembersDialog projectId={project.id} />
      </CardHeader>
      <CardContent>
        <ProjectMemberPanel projectId={project.id} manageable />
      </CardContent>
    </Card>
  );
}
