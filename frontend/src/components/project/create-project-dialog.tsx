"use client";

import { useState } from "react";
import { useCreateProject } from "@/hooks/queries/project/project.mutations";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { notify } from "@/lib/toast";
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

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoId, setRepoId] = useState<string>(NO_REPO);
  const create = useCreateProject();
  const { data: repos } = useRepos();

  function reset() {
    setName("");
    setDescription("");
    setRepoId(NO_REPO);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        repoId: repoId === NO_REPO ? null : repoId,
      },
      {
        onSuccess: (project) => {
          setOpen(false);
          reset();
          notify.success("Project created", { description: project.name });
        },
        onError: (err) => notify.apiError(err, "Could not create project"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New project</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              A project bundles its own onboarding tracks. Members must pass every track before the
              project unlocks for them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project-name">
                Name
              </label>
              <Input
                id="project-name"
                placeholder="e.g. Payments Service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project-description">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="project-description"
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project-repo">
                Linked repo <span className="text-muted-foreground">(optional)</span>
              </label>
              <Select value={repoId} onValueChange={setRepoId}>
                <SelectTrigger id="project-repo">
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
              <p className="text-xs text-muted-foreground">
                Links the project to a codebase, so ready members show up as its go-to people.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              {create.isPending && <Spinner />}
              {create.isPending ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
