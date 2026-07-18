"use client";

import { BookOpenIcon, GitBranchIcon, LayersIcon, LinkIcon } from "lucide-react";
import { EmptyState } from "@/components/shared";
import type { ProjectDetail } from "@/schemas";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/ui";

/** Read-only "understand this project fast" panel — tech stack, repos, links and glossary. */
export function ProjectContextView({ project }: { project: ProjectDetail }) {
  const hasAny =
    project.techStack.length > 0 ||
    project.repos.length > 0 ||
    project.resourceLinks.length > 0 ||
    project.glossary.length > 0 ||
    !!project.description;

  if (!hasAny) {
    return (
      <EmptyState
        icon={BookOpenIcon}
        tone="info"
        title="No project context yet"
        description="Tech stack, repos, resource links and a glossary will appear here once they're added."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {project.techStack.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayersIcon className="size-4 text-muted-foreground" /> Tech stack
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {project.techStack.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {project.repos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranchIcon className="size-4 text-muted-foreground" /> Repositories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.repos.map((r) => (
              <div key={r.repoId} className="flex items-center gap-2 text-sm">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-primary hover:underline"
                  >
                    {r.name ?? r.url}
                  </a>
                ) : (
                  <span className="truncate">{r.name ?? r.repoId}</span>
                )}
                {r.isPrimary && <Badge variant="outline">Primary</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {project.resourceLinks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="size-4 text-muted-foreground" /> Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.resourceLinks.map((l) => (
              <a
                key={`${l.label}-${l.url}`}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm text-primary hover:underline"
              >
                {l.label}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {project.glossary.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpenIcon className="size-4 text-muted-foreground" /> Glossary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {project.glossary.map((g) => (
                <div key={g.term}>
                  <dt className="text-sm font-medium">{g.term}</dt>
                  <dd className="text-sm text-muted-foreground">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
