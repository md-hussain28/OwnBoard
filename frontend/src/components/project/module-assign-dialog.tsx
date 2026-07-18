"use client";

import { CheckIcon, UserPlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useProjectFunctionTypes,
  useProjectMembers,
  useSetTrackAssignment,
} from "@/hooks/queries/project";
import { cn, notify } from "@/lib";
import type { ProjectTrack } from "@/schemas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui";
import { FilterSelect } from "../shared/filter-select";

type Scope = "all_members" | "manual";

/** Manager control to set who a module is assigned to: everyone, or a hand-picked subset. */
export function ModuleAssignDialog({
  projectId,
  track,
}: {
  projectId: string;
  track: ProjectTrack;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(
    track.assignScope === "manual" ? "manual" : "all_members",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(track.assigneeIds));
  const [roleFilter, setRoleFilter] = useState("all");
  const { data: members } = useProjectMembers(projectId, open);
  const { data: functionTypes } = useProjectFunctionTypes(projectId, open);
  const save = useSetTrackAssignment(projectId);

  // Re-seed from the track each time the dialog opens so it reflects the latest server state.
  useEffect(() => {
    if (open) {
      setScope(track.assignScope === "manual" ? "manual" : "all_members");
      setSelected(new Set(track.assigneeIds));
      setRoleFilter("all");
    }
  }, [open, track.assignScope, track.assigneeIds]);

  const roleOptions = useMemo(
    () => [
      { value: "all", label: "All roles" },
      ...(functionTypes ?? []).map((t) => ({ value: t.id, label: t.name })),
    ],
    [functionTypes],
  );

  const visibleMembers = useMemo(
    () => (members ?? []).filter((m) => roleFilter === "all" || m.functionTypeId === roleFilter),
    [members, roleFilter],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of visibleMembers) next.add(m.employeeId);
      return next;
    });
  }

  function handleSave() {
    save.mutate(
      {
        trackId: track.id,
        scope,
        employeeIds: scope === "manual" ? Array.from(selected) : undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          notify.success("Assignment updated", { description: track.name });
        },
        onError: (err) => notify.apiError(err, "Could not update assignment"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlusIcon className="size-4" /> Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign module</DialogTitle>
          <DialogDescription>
            Choose who works through <span className="font-medium">{track.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <ScopeCard
              active={scope === "all_members"}
              title="Everyone"
              hint="All current & future members"
              onClick={() => setScope("all_members")}
            />
            <ScopeCard
              active={scope === "manual"}
              title="Specific people"
              hint="Pick who gets it"
              onClick={() => setScope("manual")}
            />
          </div>

          {scope === "manual" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {selected.size} selected
                </span>
                <div className="flex items-center gap-2">
                  {(functionTypes ?? []).length > 0 && (
                    <FilterSelect
                      aria-label="Filter members by role"
                      value={roleFilter}
                      onChange={setRoleFilter}
                      options={roleOptions}
                    />
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={selectAllVisible}>
                    Select all
                  </Button>
                </div>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {visibleMembers.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No members to assign.
                  </p>
                )}
                {visibleMembers.map((m) => {
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
                        </p>
                      </div>
                      {isSelected && <CheckIcon className="size-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeCard({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-left transition-colors",
        active ? "border-primary bg-brand-honey-soft" : "border-border hover:bg-muted",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}
