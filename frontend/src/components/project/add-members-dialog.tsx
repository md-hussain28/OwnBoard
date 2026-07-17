"use client";

import { CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import { useAddProjectMembers } from "@/hooks/queries/project/project.mutations";
import {
  useProjectFunctionTypes,
  useProjectMembers,
} from "@/hooks/queries/project/project.queries";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Spinner } from "@/ui/spinner";

const NO_FUNCTION = "__none__";

export function AddMembersDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [functionTypeId, setFunctionTypeId] = useState<string>(NO_FUNCTION);
  const { data: employees } = useEmployees({ enabled: open });
  const { data: currentMembers } = useProjectMembers(projectId, open);
  const { data: functionTypes } = useProjectFunctionTypes(projectId, open);
  const add = useAddProjectMembers(projectId);

  const existing = useMemo(
    () => new Set((currentMembers ?? []).map((m) => m.employeeId)),
    [currentMembers],
  );
  // Only employees (not admins) can be members / receive onboarding tracks.
  const candidates = (employees ?? []).filter((e) => e.appRole === "member" && !existing.has(e.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAdd() {
    if (selected.size === 0) return;
    add.mutate(
      {
        employeeIds: Array.from(selected),
        functionTypeId: functionTypeId === NO_FUNCTION ? null : functionTypeId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelected(new Set());
          setFunctionTypeId(NO_FUNCTION);
          notify.success("Members added", {
            description: "Their onboarding tracks and function modules were assigned.",
          });
        },
        onError: (err) => notify.apiError(err, "Could not add members"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add members</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>
            Added members are auto-assigned this project&apos;s onboarding modules and must pass
            them to unlock the project.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto py-2">
          {candidates.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Everyone is already on this project.
            </p>
          )}
          {candidates.map((e) => {
            const isSelected = selected.has(e.id);
            return (
              <button
                type="button"
                key={e.id}
                onClick={() => toggle(e.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-brand-honey-soft"
                    : "border-border hover:bg-muted",
                )}
              >
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.role ?? "—"}
                    {e.githubHandle ? ` · @${e.githubHandle}` : ""}
                  </p>
                </div>
                {isSelected && <CheckIcon className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
        {(functionTypes?.length ?? 0) > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Function <span className="text-muted-foreground">(optional)</span>
            </label>
            <Select value={functionTypeId} onValueChange={setFunctionTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="No function" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FUNCTION}>No function</SelectItem>
                {functionTypes?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Modules matching this function auto-assign to everyone added here.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={handleAdd} disabled={add.isPending || selected.size === 0}>
            {add.isPending && <Spinner />}
            {add.isPending
              ? "Adding..."
              : `Add ${selected.size > 0 ? selected.size : ""} member${selected.size === 1 ? "" : "s"}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
