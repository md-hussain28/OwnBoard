import {
  BookTextIcon,
  FolderKanbanIcon,
  GitBranchIcon,
  GraduationCapIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/home/home-primitives";
import { ProjectStatusBadge } from "@/components/project/project-status";
import { QueryState } from "@/components/shared/query-state";
import { useProjects } from "@/hooks/queries/project/project.queries";
import { appPath } from "@/lib/routes";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

export function ProjectsSection() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const visible = (projects ?? []).filter((p) => !p.isArchived);

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Your projects"
        hint="Team spaces and their onboarding"
        action={{ label: "View all", href: appPath("projects") }}
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={visible.length === 0}
        loading={<Skeleton className="h-28 w-full rounded-xl" />}
        empty={
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-honey-soft text-brand-honey">
                <FolderKanbanIcon className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No projects yet. Create one to give a team its own onboarding.
              </p>
              <Button asChild size="sm">
                <Link href={appPath("projects")}>
                  <PlusIcon /> New project
                </Link>
              </Button>
            </CardContent>
          </Card>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.slice(0, 6).map((project) => (
            <Link key={project.id} href={appPath("projects", project.id)} className="group">
              <Card className="h-full transition-shadow duration-200 group-hover:shadow-soft">
                <CardContent className="flex h-full flex-col gap-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold leading-tight">{project.name}</p>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="size-3.5" /> {project.memberCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GraduationCapIcon className="size-3.5" /> {project.trackCount} onboarding
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookTextIcon className="size-3.5" /> {project.moduleCount} doc
                      {project.moduleCount === 1 ? "" : "s"}
                    </span>
                    {project.repoName && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <GitBranchIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{project.repoName}</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </QueryState>
    </section>
  );
}
