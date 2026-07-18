"use client";

import type { ReactNode } from "react";
import { useProject } from "@/hooks/queries/project/project.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/ui/skeleton";

/**
 * Shared project shell — access gate + loading only.
 * The hub header lives on Overview; other sections use their own page titles.
 * Project context in the sidebar is the source of truth for "which project".
 */
export function ProjectLayoutShell({ id, children }: { id: string; children: ReactNode }) {
  const { data: project, isLoading, isError, error } = useProject(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
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

  return <div className="space-y-6">{children}</div>;
}
