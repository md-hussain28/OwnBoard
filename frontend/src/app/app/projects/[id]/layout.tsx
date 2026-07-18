"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { ProjectHubHeader } from "@/components/project/project-hub-header";
import { useProject } from "@/hooks/queries/project/project.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/ui/skeleton";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: project, isLoading, isError, error } = useProject(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <p className="text-sm text-muted-foreground">
        You don&apos;t have access to this project ({getApiErrorMessage(error)}).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectHubHeader project={project} />
      <div>{children}</div>
    </div>
  );
}
