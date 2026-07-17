"use client";

import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon, XIcon } from "lucide-react";
import { useState } from "react";
import {
  useCreateFunctionType,
  useRemoveFunctionType,
  useRemoveModule,
} from "@/hooks/queries/project/project.mutations";
import { notify } from "@/lib/toast";
import type { ProjectDetail } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Spinner } from "@/ui/spinner";
import { ModuleFormDialog } from "./module-form-dialog";

function statusVariant(status: string): "success" | "secondary" | "outline" {
  if (status === "active") return "success";
  if (status === "archived") return "outline";
  return "secondary";
}

export function ProjectModulesTab({ project }: { project: ProjectDetail }) {
  return (
    <div className="space-y-4">
      <FunctionTypesCard project={project} />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Modules</CardTitle>
          <ModuleFormDialog
            projectId={project.id}
            functionTypes={project.functionTypes}
            trigger={
              <Button size="sm">
                <PlusIcon className="size-4" /> New module
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {project.modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No modules yet. Modules are dev-facing context that auto-assigns by function.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {project.modules.map((m) => (
                <li key={m.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{m.name}</p>
                      <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                      {m.functionTypeNames.map((n) => (
                        <Badge key={n} variant="secondary">
                          {n}
                        </Badge>
                      ))}
                      {m.functionTypeNames.length === 0 && (
                        <Badge variant="outline">Everyone</Badge>
                      )}
                    </div>
                    {m.description && (
                      <p className="truncate text-sm text-muted-foreground">{m.description}</p>
                    )}
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <UsersIcon className="size-3.5" /> assigned to {m.assignedCount}
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
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
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
          onSuccess: () => notify.success("Module deleted", { description: name }),
          onError: (err) => notify.apiError(err, "Could not delete module"),
        })
      }
    >
      <Trash2Icon className="size-4 text-destructive" />
    </Button>
  );
}

function FunctionTypesCard({ project }: { project: ProjectDetail }) {
  const create = useCreateFunctionType(project.id);
  const remove = useRemoveFunctionType(project.id);
  const [name, setName] = useState("");

  function add() {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: () => setName(""),
        onError: (err) => notify.apiError(err, "Could not add function type"),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Function types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Per-project roles (e.g. Frontend, Backend). Tag modules with these and assign each member
          a function — matching modules auto-assign.
        </p>
        <div className="flex flex-wrap gap-2">
          {project.functionTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">None yet.</p>
          )}
          {project.functionTypes.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1">
              {t.name}
              <span className="text-muted-foreground">
                ({t.memberCount}·{t.moduleCount})
              </span>
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                onClick={() =>
                  remove.mutate(t.id, {
                    onError: (err) => notify.apiError(err, "Could not remove type"),
                  })
                }
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Frontend"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button variant="outline" onClick={add} disabled={create.isPending || !name.trim()}>
            {create.isPending ? <Spinner /> : <PlusIcon className="size-4" />} Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
