"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useBackgroundUpload,
  useDeleteDocument,
} from "@/hooks/queries/doc-pack/doc-pack.mutations";
import { docPackKeys, useDocPackIngestStatus } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { DocPackDocument } from "@/schemas/docPack.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

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
  const [validationError, setValidationError] = useState<string | null>(null);

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
    setValidationError(startBackgroundUpload(Array.from(fileList)));
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          accept=".pdf,.docx,.txt,.md,.markdown"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed py-8"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon className="size-4" /> Upload PDF, DOCX, TXT or MD files
        </Button>
        <p className="text-xs text-muted-foreground">
          Uploads run in the background — you can keep working while documents process.
        </p>

        {validationError && <p className="text-sm text-destructive">{validationError}</p>}

        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No documents yet. Upload at least one file to generate a quiz.
          </p>
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
                    onClick={() => deleteDocument.mutate(doc.id)}
                  >
                    <Trash2Icon className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {deleteDocument.isError && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(deleteDocument.error, "Delete failed.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
