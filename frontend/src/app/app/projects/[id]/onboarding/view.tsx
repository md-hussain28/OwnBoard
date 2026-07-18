"use client";

import { ListChecksIcon } from "lucide-react";
import { MemberOnboardingSteps } from "@/components/project/member-onboarding-steps";
import { ProjectSectionHeader } from "@/components/project/project-section-header";
import { ProjectTracksTab } from "@/components/project/project-tracks-tab";
import { useProject } from "@/hooks/queries/project/project.queries";

export function ProjectOnboardingView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;

  // Managers author onboarding modules + assign them; members see only their own assigned modules.
  if (project.canManage)
    return (
      <div className="mx-auto max-w-2xl">
        <ProjectTracksTab projectId={project.id} />
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ProjectSectionHeader
        icon={ListChecksIcon}
        title="Your modules"
        description="The learning modules assigned to you on this project. Work through each one and pass its quiz."
      />
      <MemberOnboardingSteps tracks={project.tracks} />
    </div>
  );
}
