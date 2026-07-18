"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { useUpdateProject } from "@/hooks/queries/project";
import { cn, notify } from "@/lib";
import type { ProjectDetail, UpdateProjectInput } from "@/schemas";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from "@/ui";
import { PROJECT_STATUSES, projectStatusMeta } from "./project-status";

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
  const statusMeta = projectStatusMeta(status);

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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey ring-1 ring-brand-honey/15"
              >
                <PencilIcon className="size-4.5" />
              </span>
              <div className="space-y-1">
                <DialogTitle>Edit project</DialogTitle>
                <DialogDescription>
                  Rename the project, change its status, or archive it. Repos are managed in the
                  Repos section.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="edit-project-name">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="edit-project-name"
                className="h-10 text-base sm:text-sm"
                placeholder="e.g. Payments Service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="edit-project-description">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
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
                <SelectTrigger id="edit-project-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{statusMeta.hint}</p>
            </div>

            <label
              htmlFor="edit-project-archived"
              className={cn(
                "flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3 transition-colors",
                isArchived
                  ? "border-primary/40 bg-brand-honey-soft/50"
                  : "border-border hover:bg-muted",
              )}
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
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
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
