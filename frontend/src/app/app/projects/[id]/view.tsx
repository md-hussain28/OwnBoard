"use client";

import { MemberOverview, ProjectHubHeader, ProjectOverviewTab } from "@/components/project";
import { useProject } from "@/hooks/queries/project";

export function ProjectOverviewView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  // Layout gates access; a cached project resolves instantly here.
  if (!project) return null;
  return (
    <div className="space-y-6">
      <ProjectHubHeader project={project} />
      {/* Admins/leads get the project-health view; members get the team/who-works-on-what view. */}
      {project.canManage ? (
        <ProjectOverviewTab project={project} />
      ) : (
        <MemberOverview project={project} />
      )}
    </div>
  );
}
