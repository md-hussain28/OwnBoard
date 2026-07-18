"use client";

import { FolderKanbanIcon, GitBranchIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { QueryState } from "@/components/shared/query-state";
import { useMyProjects } from "@/hooks/queries/project/project.queries";
import { appPath } from "@/lib/routes";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { PROJECT_STATUSES, ProjectStatusBadge } from "./project-status";
import { ReadinessBadge, ReadinessBar } from "./readiness";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
];

export function MyProjectsPanel() {
  const { data: projects, isLoading, isError, error } = useMyProjects();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (projects ?? []).filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !`${p.name} ${p.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, statusFilter, query]);

  const total = (projects ?? []).length;
  const hasFilters = query.trim() !== "" || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">My projects</h1>
        <p className="text-muted-foreground">Projects you&apos;ve been added to.</p>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search projects"
              placeholder="Search projects..."
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
        </div>
      )}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!!projects && projects.length === 0}
        empty={
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-full bg-brand-mist p-3 text-brand-ink">
                <FolderKanbanIcon className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                You&apos;re not on any projects yet. An admin will add you to one.
              </p>
            </CardContent>
          </Card>
        }
      >
        {visible.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">No projects match your filters.</p>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((project) => (
              <Link key={project.id} href={appPath("projects", project.id)} className="group">
                <Card className="h-full transition-shadow duration-200 group-hover:shadow-soft">
                  <CardContent className="space-y-4 py-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-semibold leading-tight">{project.name}</p>
                      <ReadinessBadge readiness={project.readiness} />
                    </div>
                    <ProjectStatusBadge status={project.status} />
                    {project.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                    <ReadinessBar readiness={project.readiness} />
                    {project.repoName && (
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <GitBranchIcon className="size-3.5" /> {project.repoName}
                      </p>
                    )}
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
