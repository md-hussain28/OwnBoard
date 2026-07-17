"use client";

import { useAssignmentDocumentContent } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { Skeleton } from "@/ui/skeleton";

export function AssignmentDocumentReader({
  assignmentId,
  documentId,
  title,
}: {
  assignmentId: string;
  documentId: string;
  title: string;
}) {
  const { data, isLoading, isError } = useAssignmentDocumentContent(assignmentId, documentId);

  return (
    <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      )}
      {isError && <p className="text-sm text-muted-foreground">Could not load “{title}”.</p>}
      {data && <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.content}</p>}
    </div>
  );
}
