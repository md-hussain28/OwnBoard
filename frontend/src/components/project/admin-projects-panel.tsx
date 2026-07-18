"use client";

import {
  BookTextIcon,
  FolderKanbanIcon,
  GraduationCapIcon,
  SearchIcon,
  UserRoundCogIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, FilteredEmpty, FilterSelect, QueryState } from "@/components/shared";
import { useProjects } from "@/hooks/queries/project";
import { appPath, cn } from "@/lib";
import { Button, Card, CardContent, Input } from "@/ui";
import { CreateProjectDialog } from "./create-project-dialog";
import { PROJECT_STATUSES, ProjectStatusBadge } from "./project-status";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

export function AdminProjectsPanel() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const archivedCount = (projects ?? []).filter((p) => p.isArchived).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (projects ?? []).filter((p) => {
      if (!showArchived && p.isArchived) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q) {
        const haystack = `${p.name} ${p.description ?? ""} ${p.leadName ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [projects, showArchived, statusFilter, query]);

  const total = (projects ?? []).length;
  const hasFilters = query.trim() !== "" || statusFilter !== "all";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Team &amp; product spaces. Each one has its own members, modules, docs and repos.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search projects"
              placeholder="Search projects or leads..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <FilterSelect
            aria-label="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
          {archivedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </Button>
          )}
        </div>
      )}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!!projects && projects.length === 0}
        empty={
          <EmptyState
            icon={FolderKanbanIcon}
            tone="honey"
            title="No projects yet"
            description="Create your first project, then add members, modules and docs."
            action={<CreateProjectDialog />}
          />
        }
      >
        {visible.length === 0 ? (
          <FilteredEmpty
            noun="projects"
            onClear={
              hasFilters
                ? () => {
                    setQuery("");
                    setStatusFilter("all");
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((project) => (
              <Link key={project.id} href={appPath("projects", project.id)} className="group">
                <Card
                  className={cn(
                    "h-full transition-shadow duration-200 group-hover:shadow-soft",
                    project.isArchived && "opacity-70",
                  )}
                >
                  <CardContent className="flex h-full flex-col gap-3 py-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold leading-tight">{project.name}</p>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    {project.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground/70">No description yet</p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UserRoundCogIcon className="size-3.5 shrink-0" />
                      {project.leadName ? (
                        <>
                          Lead:{" "}
                          <span className="font-medium text-foreground">{project.leadName}</span>
                        </>
                      ) : (
                        <span className="italic">No team lead</span>
                      )}
                    </span>
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <UsersIcon className="size-3.5" /> {project.memberCount} member
                        {project.memberCount === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GraduationCapIcon className="size-3.5" /> {project.trackCount} module
                        {project.trackCount === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BookTextIcon className="size-3.5" /> {project.moduleCount} doc
                        {project.moduleCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
