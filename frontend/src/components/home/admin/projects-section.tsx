import {
  BookTextIcon,
  FolderKanbanIcon,
  GitBranchIcon,
  GraduationCapIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/home";
import { ProjectStatusBadge } from "@/components/project";
import { EmptyState, QueryState } from "@/components/shared";
import { useProjects } from "@/hooks/queries/project";
import { appPath } from "@/lib";
import { Button, Card, CardContent, Skeleton } from "@/ui";

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
          <EmptyState
            icon={FolderKanbanIcon}
            tone="honey"
            title="No projects yet"
            description="Create one to give a team its own onboarding."
            action={
              <Button asChild size="sm">
                <Link href={appPath("projects")}>
                  <PlusIcon /> New project
                </Link>
              </Button>
            }
          />
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
