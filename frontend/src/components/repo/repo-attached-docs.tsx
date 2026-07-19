"use client";

import { FileTextIcon, ScrollTextIcon } from "lucide-react";
import { EmptyState, QueryState } from "@/components/shared";
import { useProjectDocs } from "@/hooks/queries/project";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/ui";

function statusBadge(status: string) {
  if (status === "processed") return <Badge variant="success">Ready</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Processing…</Badge>;
}

/**
 * The project documents attached to one repo. Read-only here — attachment is edited from the
 * project Docs tab. Only rendered when a repo is viewed inside its project (needs the project id
 * to resolve the knowledge base).
 */
export function RepoAttachedDocs({ projectId, repoId }: { projectId: string; repoId: string }) {
  const { data, isLoading, isError, error } = useProjectDocs(projectId);
  const docs = (data?.documents ?? []).filter((d) => d.repoIds.includes(repoId));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollTextIcon className="size-4 text-muted-foreground" /> Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={docs.length === 0}
          empty={
            <EmptyState
              icon={FileTextIcon}
              tone="mist"
              title="No documents attached"
              description="Attach reference docs to this repo from the project's Docs tab."
            />
          }
        >
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  {doc.typeNames.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {doc.typeNames.map((name) => (
                        <Badge key={name} variant="secondary">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {statusBadge(doc.status)}
              </li>
            ))}
          </ul>
        </QueryState>
      </CardContent>
    </Card>
  );
}
