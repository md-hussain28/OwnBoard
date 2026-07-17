"use client";

import { AdminProjectsPanel } from "@/components/project/admin-projects-panel";
import { MyProjectsPanel } from "@/components/project/my-projects-panel";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { Skeleton } from "@/ui/skeleton";

export default function ProjectsPage() {
  const { isAdmin, isLoading } = useAppRole();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  // Admins and employees get entirely different project surfaces.
  return isAdmin ? <AdminProjectsPanel /> : <MyProjectsPanel />;
}
