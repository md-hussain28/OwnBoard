"use client";

import { FolderKanbanIcon, GitBranchIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { QueryState } from "@/components/shared/query-state";
import { useProjects } from "@/hooks/queries/project/project.queries";
import { appPath } from "@/lib/routes";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { CreateProjectDialog } from "./create-project-dialog";

export function AdminProjectsPanel() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = (projects ?? []).filter((p) => p.status === "archived").length;
  const visible = (projects ?? []).filter((p) => showArchived || p.status !== "archived");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Team & product spaces. Each project has its own onboarding modules that members must
            pass before they gain access.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {archivedCount > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
          </Button>
        </div>
      )}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!!projects && projects.length === 0}
        empty={
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-full bg-brand-honey-soft p-3 text-brand-honey">
                <FolderKanbanIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No projects yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first project, add its onboarding modules, then assign members.
                </p>
              </div>
              <CreateProjectDialog />
            </CardContent>
          </Card>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <Link key={project.id} href={appPath("projects", project.id)} className="group">
              <Card className="h-full transition-shadow duration-200 group-hover:shadow-soft">
                <CardContent className="space-y-3 py-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">{project.name}</p>
                    {project.status === "archived" && <Badge variant="secondary">Archived</Badge>}
                  </div>
                  {project.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="size-3.5" /> {project.memberCount} member
                      {project.memberCount === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FolderKanbanIcon className="size-3.5" /> {project.trackCount} module
                      {project.trackCount === 1 ? "" : "s"}
                    </span>
                    {project.repoName && (
                      <span className="inline-flex items-center gap-1">
                        <GitBranchIcon className="size-3.5" /> {project.repoName}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
