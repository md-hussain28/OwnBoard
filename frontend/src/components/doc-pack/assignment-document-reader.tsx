"use client";

import { FileTextIcon } from "lucide-react";
import { useEffect } from "react";
import { useAssignmentDocumentContent } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { Skeleton } from "@/ui/skeleton";

function isPdf(fileType: string) {
  return fileType.toLowerCase() === "pdf";
}

export function AssignmentDocumentReader({
  assignmentId,
  documentId,
  title,
  onOpened,
}: {
  assignmentId: string;
  documentId: string;
  title: string;
  /** Fired once the document content has loaded so the parent can unlock "Mark as read". */
  onOpened?: (documentId: string) => void;
}) {
  const { data, isLoading, isError, isSuccess } = useAssignmentDocumentContent(
    assignmentId,
    documentId,
  );

  useEffect(() => {
    if (isSuccess) onOpened?.(documentId);
  }, [isSuccess, documentId, onOpened]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
      {isLoading && (
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="mt-4 h-64 w-full" />
        </div>
      )}
      {isError && <p className="p-4 text-sm text-muted-foreground">Could not load “{title}”.</p>}
      {data && isPdf(data.fileType) && data.fileUrl && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
            <FileTextIcon className="size-3.5" />
            <span className="truncate">Original PDF — scroll through before marking as read</span>
            <a
              href={data.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto shrink-0 font-medium text-foreground underline-offset-2 hover:underline"
            >
              Open in new tab
            </a>
          </div>
          <iframe
            title={title}
            src={data.fileUrl}
            className="h-[min(70vh,36rem)] w-full bg-background"
          />
        </div>
      )}
      {data && !(isPdf(data.fileType) && data.fileUrl) && (
        <div className="max-h-[min(70vh,36rem)] overflow-y-auto p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.content}</p>
        </div>
      )}
    </div>
  );
}
