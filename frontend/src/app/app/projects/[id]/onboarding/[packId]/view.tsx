"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { QuizBuilderFlow } from "@/components/doc-pack";
import { projectSectionPath } from "@/components/layout";
import { useProject } from "@/hooks/queries/project";
import { Button, Skeleton } from "@/ui";

/**
 * Authoring for a single project onboarding module (source docs + grounded quiz), kept inside the
 * project so the breadcrumb trail stays Projects → project → Project Onboarding → module — never
 * the company-wide Onboarding section, which is a separate surface.
 */
export function ProjectOnboardingModuleView({
  projectId,
  packId,
}: {
  projectId: string;
  packId: string;
}) {
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading && !project) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!project?.canManage) {
    return (
      <div className="rounded-xl border border-border px-5 py-8 text-center">
        <p className="font-medium">Managers only</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Only this project&apos;s lead and org admins can author onboarding modules.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href={projectSectionPath(projectId, "onboarding")}>Back to Project Onboarding</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link href={projectSectionPath(projectId, "onboarding")}>
          <ArrowLeftIcon className="size-4" /> Project Onboarding
        </Link>
      </Button>
      <QuizBuilderFlow packId={packId} />
    </div>
  );
}
