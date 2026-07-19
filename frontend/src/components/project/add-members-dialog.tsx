"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useEmployees } from "@/hooks/queries/employee";
import {
  useAddProjectMembers,
  useCreateFunctionType,
  useProjectFunctionTypes,
  useProjectMembers,
} from "@/hooks/queries/project";
import { cn, notify } from "@/lib";
import {
  Button,
  Dialog,
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
} from "@/ui";

export function AddMembersDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [functionTypeId, setFunctionTypeId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [localRoles, setLocalRoles] = useState<{ id: string; name: string }[]>([]);
  const { data: employees } = useEmployees({ enabled: open });
  const { data: currentMembers } = useProjectMembers(projectId, open);
  const { data: functionTypes } = useProjectFunctionTypes(projectId, open);
  const add = useAddProjectMembers(projectId);
  const createRole = useCreateFunctionType(projectId);

  const roles = useMemo(() => {
    const fetched = functionTypes ?? [];
    const fetchedIds = new Set(fetched.map((role) => role.id));
    return [...fetched, ...localRoles.filter((role) => !fetchedIds.has(role.id))];
  }, [functionTypes, localRoles]);

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
    if (selected.size === 0 || !functionTypeId) return;
    add.mutate(
      {
        employeeIds: Array.from(selected),
        functionTypeId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelected(new Set());
          setFunctionTypeId("");
          setNewRole("");
          setLocalRoles([]);
          notify.success("Members added", {
            description: "Matching modules were assigned.",
          });
        },
        onError: (err) => notify.apiError(err, "Could not add members"),
      },
    );
  }

  function handleCreateRole() {
    const name = newRole.trim();
    if (!name) return;
    createRole.mutate(
      { name },
      {
        onSuccess: (role) => {
          setLocalRoles((current) => [...current, role]);
          setFunctionTypeId(role.id);
          setNewRole("");
        },
        onError: (err) => notify.apiError(err, "Could not add role"),
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
            Added members are auto-assigned this project&apos;s modules whose targeting matches them
            (everyone, or their domain). Every member needs a domain.
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
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Domain <span className="text-destructive">*</span>
          </label>
          <Select value={functionTypeId} onValueChange={setFunctionTypeId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a domain" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              aria-label="New domain name"
              placeholder="Add a new domain"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCreateRole();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={createRole.isPending || !newRole.trim()}
              onClick={handleCreateRole}
            >
              {createRole.isPending ? <Spinner /> : <PlusIcon className="size-4" />}
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Domain-matched modules are assigned automatically. A newly added domain is selected.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={handleAdd}
            disabled={add.isPending || selected.size === 0 || !functionTypeId}
          >
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
