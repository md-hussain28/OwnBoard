"use client";

import { GitBranchIcon } from "lucide-react";
import Link from "next/link";
import { projectSectionPath } from "@/components/layout";
import { Button, Card, CardContent } from "@/ui";

/**
 * Shown on the codebase-intelligence sections (skill graph, experts, ask) when the
 * project has no connected repo yet — those features have no git history to work from.
 */
export function ProjectNeedsRepo({
  projectId,
  canManage,
}: {
  projectId: string;
  canManage: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-brand-honey-soft text-brand-honey">
          <GitBranchIcon className="size-5" />
        </span>
        <p className="max-w-sm text-sm text-muted-foreground">
          {canManage
            ? "Connect a repository to this project to unlock its git-history intelligence."
            : "This section lights up once an admin connects a repository to the project."}
        </p>
        {canManage && (
          <Button asChild variant="outline">
            <Link href={projectSectionPath(projectId, "repositories")}>Go to Repositories</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
