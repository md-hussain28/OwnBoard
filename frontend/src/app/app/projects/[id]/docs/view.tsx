"use client";

import { ProjectDocsPanel } from "@/components/project";
import { PageTourNudge } from "@/components/tour";
import { useProject } from "@/hooks/queries/project";

export function ProjectDocsView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;

  // Docs is the document knowledge base only: each doc carries a type and is attached to the repos
  // it documents. Repo/tech-stack context now lives under the Repos section.
  return (
    <div className="space-y-4" data-tour="project-panel-docs">
      <PageTourNudge featureId="project-docs" />
      <ProjectDocsPanel
        projectId={project.id}
        manageable={project.canManage}
        repos={project.repos}
      />
    </div>
  );
}
