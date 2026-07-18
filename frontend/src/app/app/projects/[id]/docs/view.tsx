"use client";

import { LayersIcon } from "lucide-react";
import {
  ProjectContextTab,
  ProjectContextView,
  ProjectDocsPanel,
  ProjectSectionHeader,
} from "@/components/project";
import { useProject } from "@/hooks/queries/project";
import { Separator } from "@/ui";

export function ProjectDocsView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;

  return (
    <div className="space-y-6" data-tour="project-panel-docs">
      {/* Context (tech stack / links / glossary) — editable for managers, read-only for members. */}
      <section className="space-y-4">
        <ProjectSectionHeader
          icon={LayersIcon}
          title="Project context"
          description="The fast way to understand this project — tech stack, repositories, key links and glossary."
        />
        {project.canManage ? (
          <ProjectContextTab project={project} />
        ) : (
          <ProjectContextView project={project} />
        )}
      </section>

      <Separator />

      {/* The typed document knowledge base. */}
      <ProjectDocsPanel projectId={project.id} manageable={project.canManage} />
    </div>
  );
}
