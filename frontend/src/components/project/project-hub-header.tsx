"use client";

import { CalendarIcon, CrownIcon, GitBranchIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDeleteProject } from "@/hooks/queries/project/project.mutations";
import { appPath } from "@/lib/routes";
import { notify } from "@/lib/toast";
import type { ProjectDetail } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import { Spinner } from "@/ui/spinner";
import { EditProjectDialog } from "./edit-project-dialog";
import { ProjectStatusBadge } from "./project-status";
import { ReadinessBar } from "./readiness";

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

/**
 * Shared hub header for a selected project — rendered once by the project layout
 * and kept above the sub-nav on every section.
 */
export function ProjectHubHeader({ project }: { project: ProjectDetail }) {
  const readiness = project.myReadiness;
  const showReadiness = !project.canManage && readiness && readiness.totalTracks > 0;

  return (
    <div className="space-y-4">
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
        {project.canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <EditProjectDialog project={project} />
            {/* Deleting a project is admin-only; a team lead manages but can't delete. */}
            {project.isAdmin && <DeleteProjectButton projectId={project.id} name={project.name} />}
          </div>
        )}
      </div>

      {showReadiness && readiness && (
        <div
          className={
            readiness.locked
              ? "rounded-xl border border-brand-amber/40 bg-brand-amber-soft/40 p-4"
              : "rounded-xl border border-brand-moss/40 bg-brand-moss-soft/40 p-4"
          }
        >
          <p className="mb-2 text-sm font-medium">
            {readiness.locked
              ? "Finish your onboarding to unlock full access to this project"
              : "You're onboarded — you have full access to this project"}
          </p>
          <ReadinessBar readiness={readiness} />
        </div>
      )}
    </div>
  );
}
