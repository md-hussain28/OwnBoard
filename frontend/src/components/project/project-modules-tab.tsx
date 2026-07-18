"use client";

import { BookTextIcon, PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useMemo } from "react";
import { useRemoveModule } from "@/hooks/queries/project/project.mutations";
import { notify } from "@/lib/toast";
import type { ProjectDetail, ProjectModule } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ModuleFormDialog } from "./module-form-dialog";

function statusVariant(status: string): "success" | "secondary" | "outline" {
  if (status === "active") return "success";
  if (status === "archived") return "outline";
  return "secondary";
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function ProjectModulesTab({ project }: { project: ProjectDetail }) {
  const groups = useMemo(() => groupDocsByRole(project), [project]);
  const hasDocs = project.modules.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">Project docs</h2>
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
            Reading for people already on the team — not the gate quizzes. When you create a doc,
            pick or add roles so it auto-assigns to matching members.
          </p>
        </div>
        <ModuleFormDialog
          projectId={project.id}
          functionTypes={project.functionTypes}
          trigger={
            <Button size="sm">
              <PlusIcon className="size-4" /> New doc
            </Button>
          }
        />
      </div>

      {!hasDocs ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <BookTextIcon className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">No docs yet</p>
          <p className="max-w-md text-sm text-pretty text-muted-foreground">
            Write project context (architecture, runbooks, local setup). Unlike Onboarding steps,
            docs don&apos;t gate access — they guide people by role.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {plural(group.docs.length, "doc", "docs")}
                </span>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {group.docs.map((m) => (
                  <DocRow key={m.id} project={project} module={m} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocRow({ project, module: m }: { project: ProjectDetail; module: ProjectModule }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{m.name}</p>
          <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
          {m.functionTypeNames.map((n) => (
            <Badge key={n} variant="secondary">
              {n}
            </Badge>
          ))}
          {m.functionTypeNames.length === 0 && <Badge variant="outline">Everyone</Badge>}
        </div>
        {m.description && <p className="truncate text-sm text-muted-foreground">{m.description}</p>}
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <UsersIcon className="size-3.5" />
          {plural(m.assignedCount, "person assigned", "people assigned")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ModuleFormDialog
          projectId={project.id}
          functionTypes={project.functionTypes}
          module={m}
          trigger={
            <Button variant="ghost" size="icon" aria-label={`Edit ${m.name}`}>
              <PencilIcon className="size-4" />
            </Button>
          }
        />
        <DeleteModuleButton projectId={project.id} moduleId={m.id} name={m.name} />
      </div>
    </li>
  );
}

function DeleteModuleButton({
  projectId,
  moduleId,
  name,
}: {
  projectId: string;
  moduleId: string;
  name: string;
}) {
  const remove = useRemoveModule(projectId);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Delete ${name}`}
      disabled={remove.isPending}
      onClick={() =>
        remove.mutate(moduleId, {
          onSuccess: () => notify.success("Doc deleted", { description: name }),
          onError: (err) => notify.apiError(err, "Could not delete doc"),
        })
      }
    >
      <Trash2Icon className="size-4 text-destructive" />
    </Button>
  );
}

type DocGroup = { key: string; label: string; docs: ProjectModule[] };

function groupDocsByRole(project: ProjectDetail): DocGroup[] {
  const byRole = new Map<string, ProjectModule[]>();
  const everyone: ProjectModule[] = [];

  for (const doc of project.modules) {
    if (doc.functionTypeIds.length === 0) {
      everyone.push(doc);
      continue;
    }
    for (const id of doc.functionTypeIds) {
      const list = byRole.get(id) ?? [];
      list.push(doc);
      byRole.set(id, list);
    }
  }

  const groups: DocGroup[] = project.functionTypes
    .map((role) => ({
      key: role.id,
      label: role.name,
      docs: byRole.get(role.id) ?? [],
    }))
    .filter((g) => g.docs.length > 0);

  if (everyone.length > 0) {
    groups.push({ key: "everyone", label: "Everyone", docs: everyone });
  }

  if (groups.length === 0 && project.modules.length > 0) {
    return [{ key: "all", label: "All docs", docs: project.modules }];
  }

  return groups;
}
