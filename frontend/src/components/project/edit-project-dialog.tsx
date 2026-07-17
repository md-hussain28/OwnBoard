"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { useUpdateProject } from "@/hooks/queries/project/project.mutations";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
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

const NO_REPO = "__none__";

/** Build a patch of only the fields that changed. repoId: null clears the link; omitted = unchanged. */
function buildChanges(
  project: ProjectDetail,
  form: { name: string; description: string; repoId: string; status: string },
): UpdateProjectInput {
  const input: UpdateProjectInput = {};
  if (form.name.trim() !== project.name) input.name = form.name.trim();
  const nextDescription = form.description.trim() || null;
  if (nextDescription !== (project.description ?? null)) input.description = nextDescription;
  const nextRepoId = form.repoId === NO_REPO ? null : form.repoId;
  if (nextRepoId !== (project.repoId ?? null)) input.repoId = nextRepoId;
  if (form.status !== project.status) input.status = form.status;
  return input;
}

export function EditProjectDialog({ project }: { project: ProjectDetail }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [repoId, setRepoId] = useState<string>(project.repoId ?? NO_REPO);
  const [status, setStatus] = useState<string>(project.status);
  const update = useUpdateProject(project.id);
  const { data: repos } = useRepos();

  // Re-seed the form from the project whenever the dialog opens so it always reflects the latest values.
  function handleOpenChange(next: boolean) {
    if (next) {
      setName(project.name);
      setDescription(project.description ?? "");
      setRepoId(project.repoId ?? NO_REPO);
      setStatus(project.status);
    }
    setOpen(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const input = buildChanges(project, { name, description, repoId, status });
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
              Rename the project, change or clear its linked repo, or archive it.
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
              <label className="text-sm font-medium" htmlFor="edit-project-repo">
                Linked repo <span className="text-muted-foreground">(optional)</span>
              </label>
              <Select value={repoId} onValueChange={setRepoId}>
                <SelectTrigger id="edit-project-repo">
                  <SelectValue placeholder="No repo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REPO}>No repo</SelectItem>
                  {repos?.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Archived projects are hidden from the default projects list.
              </p>
            </div>
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
