"use client";

import { CheckCircle2Icon, ChevronDownIcon, ClockIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { useSetModuleProgress } from "@/hooks/queries/project/project.mutations";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ProjectModule } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Spinner } from "@/ui/spinner";

function ModuleCard({ projectId, module }: { projectId: string; module: ProjectModule }) {
  const [open, setOpen] = useState(false);
  const progress = useSetModuleProgress(projectId);
  const completed = module.myCompleted;

  function toggleComplete() {
    progress.mutate(
      { moduleId: module.id, status: completed ? "in_progress" : "completed" },
      {
        onSuccess: () =>
          notify.success(completed ? "Marked in progress" : "Doc completed", {
            description: module.name,
          }),
        onError: (err) => notify.apiError(err, "Could not update progress"),
      },
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border",
        completed ? "border-brand-moss/40 bg-brand-moss-soft" : "border-border",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {completed && <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-brand-moss" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{module.name}</p>
            {module.functionTypeNames.map((n) => (
              <Badge key={n} variant="secondary">
                {n}
              </Badge>
            ))}
          </div>
          {module.description && (
            <p className="text-sm text-muted-foreground">{module.description}</p>
          )}
          {module.estimatedMinutes != null && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" /> {module.estimatedMinutes} min
            </p>
          )}
        </div>
        {(module.content || module.resourceLinks.length > 0) && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle details"
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t px-4 py-3">
          {module.content && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{module.content}</p>
          )}
          {module.resourceLinks.length > 0 && (
            <div className="space-y-1">
              {module.resourceLinks.map((l) => (
                <a
                  key={`${l.label}-${l.url}`}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLinkIcon className="size-3.5" /> {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end border-t px-4 py-2">
        <Button
          variant={completed ? "ghost" : "outline"}
          size="sm"
          disabled={progress.isPending}
          onClick={toggleComplete}
        >
          {progress.isPending && <Spinner />}
          {completed ? "Mark incomplete" : "Mark complete"}
        </Button>
      </div>
    </div>
  );
}

export function MemberModulesList({
  projectId,
  modules,
}: {
  projectId: string;
  modules: ProjectModule[];
}) {
  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No docs assigned to you on this project yet.</p>
    );
  }
  return (
    <div className="space-y-2">
      {modules.map((m) => (
        <ModuleCard key={m.id} projectId={projectId} module={m} />
      ))}
    </div>
  );
}
