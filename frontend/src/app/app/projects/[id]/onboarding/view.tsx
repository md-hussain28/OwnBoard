"use client";

import { ListChecksIcon } from "lucide-react";
import {
  MemberOnboardingSteps,
  ProjectSectionHeader,
  ProjectTracksTab,
} from "@/components/project";
import { useProject } from "@/hooks/queries/project";

export function ProjectOnboardingView({ id }: { id: string }) {
  const { data: project } = useProject(id);
  if (!project) return null;

  // Managers author onboarding modules + assign them; members see only their own assigned modules.
  return (
    <div data-tour="project-panel-onboarding">
      {project.canManage ? (
        <ProjectTracksTab projectId={project.id} />
      ) : (
        <div className="space-y-4">
          <ProjectSectionHeader
            icon={ListChecksIcon}
            title="Your modules"
            description="The learning modules assigned to you on this project. Work through each one and pass its quiz."
          />
          <MemberOnboardingSteps tracks={project.tracks} />
        </div>
      )}
    </div>
  );
}
