"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, UserPlusIcon } from "lucide-react";
import { useDocPacks } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { packAssignmentKeys } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { packAssignmentService } from "@/services/pack-assignment.service";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { Badge } from "@/ui/badge";
import type { DocPackListItem } from "@/schemas/docPack.schema";
import type { PackAssignment, PackAssignmentStatus } from "@/schemas/packAssignment.schema";

const STATUS_LABEL: Record<DocPackListItem["status"], string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
  needs_review: "Needs review",
};

function packStatusVariant(status: DocPackListItem["status"]) {
  if (status === "active") return "success" as const;
  if (status === "needs_review") return "warning" as const;
  if (status === "archived") return "outline" as const;
  return "secondary" as const;
}

const PROGRESS_ORDER: PackAssignmentStatus[] = [
  "passed",
  "failed",
  "quiz_in_progress",
  "ready_for_quiz",
  "reading",
  "assigned",
];

const PROGRESS_SHORT: Record<PackAssignmentStatus, string> = {
  assigned: "assigned",
  reading: "reading",
  ready_for_quiz: "ready",
  quiz_in_progress: "in quiz",
  passed: "passed",
  failed: "failed",
};

function summarizeProgress(assignments: PackAssignment[]): string {
  if (assignments.length === 0) return "Not assigned yet";
  const counts = new Map<PackAssignmentStatus, number>();
  for (const a of assignments) {
    counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  }
  return PROGRESS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0)
    .map((s) => `${counts.get(s)} ${PROGRESS_SHORT[s]}`)
    .join(" · ");
}

export function QuizPackList({
  onAssignPack,
}: {
  onAssignPack: (packId: string) => void;
}) {
  const { data: packs, isLoading, isError, error } = useDocPacks();

  const packIds = useMemo(() => (packs ?? []).map((p) => p.id), [packs]);

  const assignmentQueries = useQueries({
    queries: packIds.map((packId) => ({
      queryKey: packAssignmentKeys.forPack(packId),
      queryFn: () => packAssignmentService.listForPack(packId),
      enabled: packIds.length > 0,
      staleTime: 30_000,
    })),
  });

  const progressByPackId = useMemo(() => {
    const map = new Map<string, { text: string; loading: boolean; count: number }>();
    packIds.forEach((packId, index) => {
      const q = assignmentQueries[index];
      if (!q || q.isLoading) {
        map.set(packId, { text: "", loading: true, count: 0 });
      } else if (q.isError) {
        map.set(packId, { text: "Progress unavailable", loading: false, count: 0 });
      } else {
        const data = q.data ?? [];
        map.set(packId, {
          text: summarizeProgress(data),
          loading: false,
          count: data.length,
        });
      }
    });
    return map;
  }, [packIds, assignmentQueries]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Quizzes</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Every pack you can assign. Open Assign to pick people and see who has passed.
          </p>
        </div>
        <Button asChild>
          <Link href="/doc-packs/new">
            <PlusIcon className="size-4" />
            Create quiz
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Could not reach the backend (
          {error instanceof Error ? error.message : "unknown error"}). Start the FastAPI service
          and refresh.
        </p>
      )}

      {!isLoading && !isError && packs?.length === 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground text-pretty">
            No quizzes yet. Create one to upload documents and generate a cited quiz, then assign
            it to hires from this list.
          </p>
          <Button asChild>
            <Link href="/doc-packs/new">Create your first quiz</Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && packs && packs.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background shadow-soft">
          {packs.map((pack) => {
            const progress = progressByPackId.get(pack.id);
            return (
              <li
                key={pack.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{pack.name}</p>
                    <Badge variant={packStatusVariant(pack.status)}>
                      {STATUS_LABEL[pack.status]}
                    </Badge>
                  </div>
                  {pack.description && (
                    <p className="truncate text-sm text-muted-foreground">{pack.description}</p>
                  )}
                  {progress?.loading ? (
                    <Skeleton className="h-3 w-36" />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {progress?.text ?? "Not assigned yet"}
                      {progress && progress.count > 0
                        ? ` · ${progress.count} ${progress.count === 1 ? "person" : "people"}`
                        : ""}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onAssignPack(pack.id)}
                  >
                    <UserPlusIcon className="size-3.5" />
                    Assign
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/doc-packs/${pack.id}`}>
                      <PencilIcon className="size-3.5" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
