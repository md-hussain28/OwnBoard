"use client";

import { useParams } from "next/navigation";
import { AdminProjectDetail } from "@/components/project/admin-project-detail";
import { MemberProjectDetail } from "@/components/project/member-project-detail";
import { useProject } from "@/hooks/queries/project/project.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/ui/skeleton";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: project, isLoading, isError, error } = useProject(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-24 w-full rounded-xl" />
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

  // Admins and this project's team lead get the management view; members get their gated view.
  return project.canManage ? (
    <AdminProjectDetail projectId={id} />
  ) : (
    <MemberProjectDetail project={project} />
  );
}
