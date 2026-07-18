"use client";

import { CheckIcon, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useSetRepoMembers } from "@/hooks/queries/project/project.mutations";
import { useProjectMembers } from "@/hooks/queries/project/project.queries";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ProjectRepo } from "@/schemas/project.schema";
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

/** Manager control to set which project members work on a given repo. */
export function RepoMembersDialog({ projectId, repo }: { projectId: string; repo: ProjectRepo }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(repo.assignees.map((a) => a.employeeId)),
  );
  const { data: members } = useProjectMembers(projectId, open);
  const save = useSetRepoMembers(projectId);

  useEffect(() => {
    if (open) setSelected(new Set(repo.assignees.map((a) => a.employeeId)));
  }, [open, repo.assignees]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSave() {
    save.mutate(
      { repoId: repo.repoId, employeeIds: Array.from(selected) },
      {
        onSuccess: () => {
          setOpen(false);
          notify.success("Repo assignees updated", { description: repo.name ?? repo.repoId });
        },
        onError: (err) => notify.apiError(err, "Could not update assignees"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UsersIcon className="size-4" /> People
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Who works on this repo?</DialogTitle>
          <DialogDescription>
            Assign the project members working on{" "}
            <span className="font-medium">{repo.name ?? repo.repoId}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto py-1">
          {(members ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Add members to the project first.
            </p>
          )}
          {(members ?? []).map((m) => {
            const isSelected = selected.has(m.employeeId);
            return (
              <button
                type="button"
                key={m.employeeId}
                onClick={() => toggle(m.employeeId)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-brand-honey-soft"
                    : "border-border hover:bg-muted",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.functionTypeName ?? m.role ?? "Member"}
                    {m.githubHandle ? ` · @${m.githubHandle}` : ""}
                  </p>
                </div>
                {isSelected && <CheckIcon className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
