"use client";

import { CalendarIcon, CrownIcon, GitBranchIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDeleteProject } from "@/hooks/queries/project/project.mutations";
import { useProject } from "@/hooks/queries/project/project.queries";
import { appPath } from "@/lib/routes";
import { notify } from "@/lib/toast";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import { Skeleton } from "@/ui/skeleton";
import { Spinner } from "@/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { AddMembersDialog } from "./add-members-dialog";
import { EditProjectDialog } from "./edit-project-dialog";
import { ProjectContextTab } from "./project-context-tab";
import { ProjectMemberPanel } from "./project-member-panel";
import { ProjectModulesTab } from "./project-modules-tab";
import { ProjectOverviewTab } from "./project-overview-tab";
import { ProjectStatusBadge } from "./project-status";
import { ProjectTracksTab } from "./project-tracks-tab";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const del = useDeleteProject();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Delete project">
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
          <DialogDescription>
            This permanently deletes <span className="font-medium">{name}</span>, its onboarding,
            docs, and all memberships. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={del.isPending}
            onClick={() =>
              del.mutate(projectId, {
                onSuccess: () => {
                  notify.success("Project deleted", { description: name });
                  router.push(appPath("projects"));
                },
                onError: (err) => notify.apiError(err, "Could not delete project"),
              })
            }
          >
            {del.isPending && <Spinner />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminProjectDetail({ projectId }: { projectId: string }) {
  const { data: project, isLoading, isError } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !project) {
    return <p className="text-sm text-muted-foreground">Could not load this project.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            {project.isArchived && <Badge variant="outline">Archived</Badge>}
            {project.myIsLead && !project.isAdmin && (
              <Badge variant="default">
                <CrownIcon className="size-3" /> You lead this
              </Badge>
            )}
          </div>
          {project.description && (
            <p className="max-w-2xl text-muted-foreground">{project.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" /> Created {formatDate(project.createdAt)}
            </span>
            {project.repoName && (
              <span className="inline-flex items-center gap-1.5">
                <GitBranchIcon className="size-3.5" />
                {project.repoUrl ? (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    {project.repoName}
                  </a>
                ) : (
                  project.repoName
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <EditProjectDialog project={project} />
          {/* Deleting a project is admin-only; a team lead manages but can't delete. */}
          {project.isAdmin && <DeleteProjectButton projectId={project.id} name={project.name} />}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members ({project.memberCount})</TabsTrigger>
          <TabsTrigger value="tracks">Onboarding ({project.trackCount})</TabsTrigger>
          <TabsTrigger value="modules">Docs ({project.moduleCount})</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ProjectOverviewTab project={project} />
        </TabsContent>
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Members</CardTitle>
              <AddMembersDialog projectId={project.id} />
            </CardHeader>
            <CardContent>
              <ProjectMemberPanel projectId={project.id} manageable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="modules">
          <ProjectModulesTab project={project} />
        </TabsContent>
        <TabsContent value="tracks">
          <Card>
            <CardContent className="pt-6">
              <ProjectTracksTab projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="context">
          <ProjectContextTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
