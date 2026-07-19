"use client";

import { ListChecksIcon } from "lucide-react";
import {
  MemberOnboardingSteps,
  ProjectSectionHeader,
  ProjectTracksTab,
} from "@/components/project";
import { PageTourNudge } from "@/components/tour";
import { useProject } from "@/hooks/queries/project";

export function ProjectOnboardingView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;

  // Managers author onboarding modules + assign them; members see only their own assigned modules.
  return (
    <div className="space-y-4" data-tour="project-panel-onboarding">
      <PageTourNudge featureId="project-modules" />
      {project.canManage ? (
        <ProjectTracksTab project={project} />
      ) : (
        <div className="space-y-4">
          <ProjectSectionHeader
            icon={ListChecksIcon}
            title="Your onboarding"
            description="The modules assigned to you on this project. Work through each one and pass its quiz."
          />
          <MemberOnboardingSteps tracks={project.tracks} />
        </div>
      )}
    </div>
  );
}
