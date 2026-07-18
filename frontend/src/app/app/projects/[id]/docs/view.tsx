"use client";

import { LayersIcon } from "lucide-react";
import { ProjectContextTab } from "@/components/project/project-context-tab";
import { ProjectContextView } from "@/components/project/project-context-view";
import { ProjectDocsPanel } from "@/components/project/project-docs-panel";
import { ProjectSectionHeader } from "@/components/project/project-section-header";
import { useProject } from "@/hooks/queries/project/project.queries";
import { Separator } from "@/ui/separator";

export function ProjectDocsView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
