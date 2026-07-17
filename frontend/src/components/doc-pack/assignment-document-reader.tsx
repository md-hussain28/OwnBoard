"use client";

import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAssignmentDocumentContent } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/ui/skeleton";

function isPdf(fileType: string) {
  return fileType.toLowerCase() === "pdf";
}

/** Prefer page-width fit and hide browser PDF chrome where supported. */
function viewOnlyPdfSrc(fileUrl: string) {
  const base = fileUrl.split("#")[0] ?? fileUrl;
  return `${base}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
}

export function AssignmentDocumentReader({
  assignmentId,
  documentId,
  title,
  onOpened,
  className,
}: {
  assignmentId: string;
  documentId: string;
  title: string;
  /** Fired once the document content has loaded so the parent can unlock "Mark as read". */
  onOpened?: (documentId: string) => void;
  className?: string;
}) {
  const { data, isLoading, isError, isSuccess } = useAssignmentDocumentContent(
    assignmentId,
    documentId,
  );
  const [iframeReady, setIframeReady] = useState(false);

  // Reset the fade-in whenever the active document changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: document switch must clear ready state
  useEffect(() => {
    setIframeReady(false);
  }, [documentId]);

  useEffect(() => {
    if (isSuccess) onOpened?.(documentId);
  }, [isSuccess, documentId, onOpened]);

  const showPdf = Boolean(data && isPdf(data.fileType) && data.fileUrl);

  return (
    <div
      className={cn(
        "relative flex min-h-[min(72vh,40rem)] flex-col overflow-hidden rounded-2xl bg-muted/40",
        className,
      )}
    >
      {isLoading && (
        <div className="flex flex-1 flex-col gap-3 p-6">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-full min-h-80 w-full flex-1 rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load “{title}”.</p>
        </div>
      )}

      {showPdf && data?.fileUrl && (
        <>
          {!iframeReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted/40">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Opening document…</p>
            </div>
          )}
          <iframe
            key={documentId}
            title={title}
            src={viewOnlyPdfSrc(data.fileUrl)}
            className={cn(
              "h-[min(72vh,40rem)] w-full flex-1 border-0 bg-background transition-opacity duration-300",
              iframeReady ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setIframeReady(true)}
            onContextMenu={(event) => event.preventDefault()}
          />
        </>
      )}

      {data && !showPdf && (
        <div className="max-h-[min(72vh,40rem)] flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FileTextIcon className="size-3.5" />
            {data.fileType.toUpperCase()}
          </div>
          <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-pretty">
            {data.content}
          </p>
        </div>
      )}
    </div>
  );
}
