"use client";

import { useParams } from "next/navigation";
import { MemberOnboardingSteps } from "@/components/project/member-onboarding-steps";
import { ProjectTracksTab } from "@/components/project/project-tracks-tab";
import { useProject } from "@/hooks/queries/project/project.queries";

export default function ProjectOnboardingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id);
  if (!project) return null;

  // Managers author onboarding tracks + assign them; members see their own gating steps.
  return project.canManage ? (
    <ProjectTracksTab projectId={project.id} />
  ) : (
    <MemberOnboardingSteps tracks={project.tracks} />
  );
}
