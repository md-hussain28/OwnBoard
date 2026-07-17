"use client";

import { FolderKanbanIcon, GitBranchIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { QueryState } from "@/components/shared/query-state";
import { useMyProjects } from "@/hooks/queries/project/project.queries";
import { appPath } from "@/lib/routes";
import { Card, CardContent } from "@/ui/card";
import { ReadinessBadge, ReadinessBar } from "./readiness";

export function MyProjectsPanel() {
  const { data: projects, isLoading, isError, error } = useMyProjects();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">My projects</h1>
        <p className="text-muted-foreground">
          Projects you&apos;ve been added to. Pass a project&apos;s onboarding modules to unlock it.
        </p>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!!projects && projects.length === 0}
        empty={
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-full bg-brand-mist p-3 text-brand-ink">
                <FolderKanbanIcon className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                You&apos;re not on any projects yet. An admin will add you to one.
              </p>
            </CardContent>
          </Card>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {projects?.map((project) => (
            <Link key={project.id} href={appPath("projects", project.id)} className="group">
              <Card className="h-full transition-shadow duration-200 group-hover:shadow-soft">
                <CardContent className="space-y-4 py-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {project.readiness.locked && (
                        <LockIcon className="size-4 text-muted-foreground" />
                      )}
                      <p className="font-semibold leading-tight">{project.name}</p>
                    </div>
                    <ReadinessBadge readiness={project.readiness} />
                  </div>
                  {project.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <ReadinessBar readiness={project.readiness} />
                  {project.repoName && (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranchIcon className="size-3.5" /> {project.repoName}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
