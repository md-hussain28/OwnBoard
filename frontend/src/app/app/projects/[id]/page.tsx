"use client";

import { useParams } from "next/navigation";
import { ProjectOverviewTab } from "@/components/project/project-overview-tab";
import { useProject } from "@/hooks/queries/project/project.queries";

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id);
  // The layout renders loading/error/header; a cached project resolves instantly here.
  if (!project) return null;
  return <ProjectOverviewTab project={project} />;
}
