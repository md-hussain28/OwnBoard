"use client";

import { ArrowLeftIcon, GitBranchIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
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
import { ProjectMemberPanel } from "./project-member-panel";
import { ProjectTracksTab } from "./project-tracks-tab";

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
            This permanently deletes <span className="font-medium">{name}</span>, its
            project-specific modules, and all memberships. This cannot be undone.
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
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="text-sm text-muted-foreground">Could not load this project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.status === "archived" && <Badge variant="secondary">Archived</Badge>}
          </div>
          {project.description && <p className="text-muted-foreground">{project.description}</p>}
          {project.repoName && (
            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
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
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <EditProjectDialog project={project} />
          <DeleteProjectButton projectId={project.id} name={project.name} />
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members ({project.memberCount})</TabsTrigger>
          <TabsTrigger value="tracks">Modules ({project.trackCount})</TabsTrigger>
        </TabsList>
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
        <TabsContent value="tracks">
          <Card>
            <CardContent className="pt-6">
              <ProjectTracksTab projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href={appPath("projects")}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" /> All projects
    </Link>
  );
}
