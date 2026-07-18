"use client";

import { FolderPlusIcon, UserRoundIcon } from "lucide-react";
import { useState } from "react";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import { useCreateProject } from "@/hooks/queries/project/project.mutations";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogClose,
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
import { PROJECT_STATUSES, projectStatusMeta } from "./project-status";

const NO_LEAD = "__none__";

/** Two-letter initials for the lead avatar chip. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [leadEmployeeId, setLeadEmployeeId] = useState<string>(NO_LEAD);
  const create = useCreateProject();
  // Only non-admin employees can lead (admins can't be project members).
  const { data: employees } = useEmployees({ enabled: open });
  const leadCandidates = (employees ?? []).filter((e) => e.appRole === "member");
  const statusMeta = projectStatusMeta(status);

  function reset() {
    setName("");
    setDescription("");
    setStatus("active");
    setLeadEmployeeId(NO_LEAD);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        status,
        leadEmployeeId: leadEmployeeId === NO_LEAD ? null : leadEmployeeId,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>New project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey ring-1 ring-brand-honey/15"
              >
                <FolderPlusIcon className="size-5" />
              </span>
              <div className="space-y-1">
                <DialogTitle>New project</DialogTitle>
                <DialogDescription>
                  Start with a name — add members, modules, docs and repos once it&apos;s created.
                  Everything here is editable later.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project-name">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="project-name"
                className="h-10 text-base sm:text-sm"
                placeholder="e.g. Payments Service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project-description">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="project-description"
                placeholder="What is this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="project-status">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="project-status" className="w-full">
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
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="project-lead">
                  Team lead <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Select value={leadEmployeeId} onValueChange={setLeadEmployeeId}>
                  <SelectTrigger id="project-lead" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LEAD}>
                      <span className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <UserRoundIcon className="size-3" />
                        </span>
                        <span className="text-muted-foreground">No team lead</span>
                      </span>
                    </SelectItem>
                    {leadCandidates.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="flex items-center gap-2">
                          <span className="flex size-5 items-center justify-center rounded-full bg-brand-honey-soft text-xs font-semibold text-brand-honey">
                            {initials(e.name)}
                          </span>
                          <span className="truncate">{e.name}</span>
                          {e.role ? (
                            <span className="truncate text-muted-foreground">· {e.role}</span>
                          ) : null}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="-mt-1.5 text-xs text-muted-foreground">
              {statusMeta.hint} The team lead can manage this project like an admin — you can change
              them anytime.
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
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
