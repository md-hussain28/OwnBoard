"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { useUpdateProject } from "@/hooks/queries/project/project.mutations";
import { notify } from "@/lib/toast";
import type { ProjectDetail, UpdateProjectInput } from "@/schemas/project.schema";
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
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Spinner } from "@/ui/spinner";
import { Textarea } from "@/ui/textarea";
import { PROJECT_STATUSES } from "./project-status";

/** Build a patch of only the fields that changed. */
function buildChanges(
  project: ProjectDetail,
  form: { name: string; description: string; status: string; isArchived: boolean },
): UpdateProjectInput {
  const input: UpdateProjectInput = {};
  if (form.name.trim() !== project.name) input.name = form.name.trim();
  const nextDescription = form.description.trim() || null;
  if (nextDescription !== (project.description ?? null)) input.description = nextDescription;
  if (form.status !== project.status) input.status = form.status;
  if (form.isArchived !== project.isArchived) input.isArchived = form.isArchived;
  return input;
}

export function EditProjectDialog({ project }: { project: ProjectDetail }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<string>(project.status);
  const [isArchived, setIsArchived] = useState<boolean>(project.isArchived);
  const update = useUpdateProject(project.id);

  // Re-seed the form from the project whenever the dialog opens so it always reflects the latest values.
  function handleOpenChange(next: boolean) {
    if (next) {
      setName(project.name);
      setDescription(project.description ?? "");
      setStatus(project.status);
      setIsArchived(project.isArchived);
    }
    setOpen(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const input = buildChanges(project, { name, description, status, isArchived });
    if (Object.keys(input).length === 0) {
      setOpen(false);
      return;
    }

    update.mutate(input, {
      onSuccess: (updated) => {
        setOpen(false);
        notify.success("Project updated", { description: updated.name });
      },
      onError: (err) => notify.apiError(err, "Could not update project"),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit project">
          <PencilIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Rename the project, change its status, or archive it. Repos are managed in the Repos
              section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="edit-project-name">
                Name
              </label>
              <Input
                id="edit-project-name"
                placeholder="e.g. Payments Service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="edit-project-description">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="edit-project-description"
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="edit-project-status">
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="edit-project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label
              htmlFor="edit-project-archived"
              className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border p-3"
            >
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Archived</span>
                <span className="block text-xs text-muted-foreground">
                  Hides the project from the default list. Its status is kept.
                </span>
              </span>
              <input
                id="edit-project-archived"
                type="checkbox"
                checked={isArchived}
                onChange={(e) => setIsArchived(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={update.isPending || !name.trim()}>
              {update.isPending && <Spinner />}
              {update.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
