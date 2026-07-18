"use client";

import { useState } from "react";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import { useCreateProject } from "@/hooks/queries/project/project.mutations";
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
import { PROJECT_STATUSES } from "./project-status";

const NO_LEAD = "__none__";

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

  function reset() {
    setName("");
    setDescription("");
    setStatus("active");
    setLeadEmployeeId(NO_LEAD);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New project</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Just a name to start. Add members, modules, docs and repos once it&apos;s created —
              everything here is editable later.
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
              <label className="text-sm font-medium" htmlFor="project-status">
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="project-status">
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="project-lead">
                Team lead <span className="text-muted-foreground">(optional)</span>
              </label>
              <Select value={leadEmployeeId} onValueChange={setLeadEmployeeId}>
                <SelectTrigger id="project-lead">
                  <SelectValue placeholder="No team lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LEAD}>No team lead</SelectItem>
                  {leadCandidates.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                      {e.role ? ` · ${e.role}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The lead can manage this project like an admin. You can change them anytime.
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
