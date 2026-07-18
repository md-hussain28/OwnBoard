"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/shared";
import {
  docPackKeys,
  useBackgroundUpload,
  useDeleteDocument,
  useDocPackIngestStatus,
} from "@/hooks/queries/doc-pack";
import { MAX_UPLOAD_FILE_SIZE_MB, notify } from "@/lib";
import type { DocPackDocument } from "@/schemas";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/ui";

const STATUS_LABEL: Record<DocPackDocument["status"], string> = {
  uploaded: "Queued",
  processing: "Processing",
  processed: "Processed",
  failed: "Failed",
};

function statusVariant(status: DocPackDocument["status"]) {
  if (status === "processed") return "default" as const;
  if (status === "failed") return "destructive" as const;
  return "secondary" as const;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function DocPackDocuments({
  packId,
  packName,
  documents,
}: {
  packId: string;
  packName: string;
  documents: DocPackDocument[];
}) {
  const queryClient = useQueryClient();
  const startBackgroundUpload = useBackgroundUpload(packId, packName);
  const deleteDocument = useDeleteDocument(packId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPendingDocuments = documents.some(
    (d) => d.status === "uploaded" || d.status === "processing",
  );
  // Cheap column-only poll — the heavy pack query is only re-fetched on transitions.
  const { data: ingestStatus } = useDocPackIngestStatus(packId, hasPendingDocuments);

  // Overlay live statuses onto the (possibly stale) pack detail data.
  const liveById = new Map(ingestStatus?.documents.map((d) => [d.id, d]) ?? []);
  const rows = documents.map((doc) => {
    const live = liveById.get(doc.id);
    return live
      ? { ...doc, status: live.status, pageCount: live.pageCount, errorMessage: live.errorMessage }
      : doc;
  });

  // Once the poll reports everything terminal, refresh the pack so the rest of the
  // builder (quiz step gating) sees the final statuses.
  useEffect(() => {
    if (hasPendingDocuments && ingestStatus?.isComplete) {
      void queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
    }
  }, [hasPendingDocuments, ingestStatus?.isComplete, packId, queryClient]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const validationError = startBackgroundUpload(Array.from(fileList));
    if (validationError) {
      notify.error(validationError, { id: `upload-validation:${packId}` });
    } else {
      notify.info("Upload started", {
        description: "Processing continues in the background.",
        id: `upload-start:${packId}`,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDelete(doc: DocPackDocument) {
    deleteDocument.mutate(doc.id, {
      onSuccess: () => {
        notify.success("Document removed", {
          description: doc.title,
          id: `doc-del:${doc.id}`,
        });
      },
      onError: (err) => {
        notify.apiError(err, "Delete failed", { id: `doc-del-error:${doc.id}` });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed py-8"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon className="size-4" /> Upload PDF files (up to {MAX_UPLOAD_FILE_SIZE_MB} MB
          each)
        </Button>
        <p className="text-xs text-muted-foreground">
          PDF only, max {MAX_UPLOAD_FILE_SIZE_MB} MB per file. Uploads run in the background — you
          can keep working while documents process.
        </p>

        {rows.length === 0 && (
          <EmptyState
            icon={FileTextIcon}
            tone="mist"
            compact
            bordered={false}
            title="No documents yet"
            description="Upload at least one file to generate a quiz."
          />
        )}

        {rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.fileType.toUpperCase()} · {formatSize(doc.fileSizeBytes)}
                      {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
                    </p>
                    {doc.status === "failed" && doc.errorMessage && (
                      <p className="truncate text-xs text-destructive">{doc.errorMessage}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={statusVariant(doc.status)}>
                    {(doc.status === "processing" || doc.status === "uploaded") && (
                      <Loader2Icon className="size-3 animate-spin" />
                    )}
                    {STATUS_LABEL[doc.status]}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${doc.title}`}
                    disabled={deleteDocument.isPending}
                    onClick={() => handleDelete(doc)}
                  >
                    {deleteDocument.isPending && deleteDocument.variables === doc.id ? (
                      <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2Icon className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
