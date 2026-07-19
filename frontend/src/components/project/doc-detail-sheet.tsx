"use client";

import {
  AlertTriangleIcon,
  CalendarPlusIcon,
  ClockIcon,
  FileTextIcon,
  GitBranchIcon,
  HashIcon,
  LayersIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useProjectDocContent } from "@/hooks/queries/ask";
import { useRetryProjectDoc } from "@/hooks/queries/project";
import { notify } from "@/lib";
import type { ProjectDoc } from "@/schemas";
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@/ui";

function statusBadge(status: string) {
  if (status === "processed") return <Badge variant="success">Ready</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Processing…</Badge>;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * View-first detail sidebar for one knowledge-base document. Opened by clicking a row in the
 * Documents panel. Shows its ingest state, metadata, tags/attachments, and — once indexed — a live
 * preview of the extracted text (the exact content "Ask project" retrieves and cites). Failed docs
 * surface their error and a Retry action for managers.
 */
export function DocDetailSheet({
  projectId,
  doc,
  manageable,
  open,
  onOpenChange,
}: {
  projectId: string;
  doc: ProjectDoc | null;
  manageable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const retry = useRetryProjectDoc(projectId);
  // Only fetch the extracted text once the sheet is open and the doc actually has indexed content.
  const content = useProjectDocContent(
    projectId,
    doc?.id ?? null,
    open && doc?.status === "processed",
  );

  if (!doc) return null;

  function handleRetry() {
    if (!doc) return;
    retry.mutate(doc.id, {
      onSuccess: () => notify.info("Retrying document", { description: doc.title }),
      onError: (err) => notify.apiError(err, "Retry failed"),
    });
  }

  const chunks = content.data?.chunks ?? [];
  const previewText = chunks.map((c) => c.content).join("\n\n");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 gap-2 border-b pr-10">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-coral-soft text-brand-coral">
              <FileTextIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <SheetTitle className="min-w-0 flex-1 break-words">{doc.title}</SheetTitle>
                {statusBadge(doc.status)}
              </div>
              <SheetDescription className="mt-0.5">
                {doc.description || "No description added"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Ingest error + recovery */}
          {doc.status === "failed" && (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <p>{doc.errorMessage || "This document failed to process."}</p>
              </div>
              {manageable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={retry.isPending}
                >
                  <RotateCcwIcon className="size-4" /> Retry processing
                </Button>
              )}
            </div>
          )}

          {/* Metadata */}
          <section className="space-y-3">
            <SectionLabel>Details</SectionLabel>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Fact icon={FileTextIcon} label="File type" value={doc.fileType.toUpperCase()} />
              <Fact icon={LayersIcon} label="Size" value={formatBytes(doc.fileSizeBytes)} />
              <Fact
                icon={HashIcon}
                label="Pages"
                value={doc.pageCount != null ? String(doc.pageCount) : "—"}
              />
              <Fact
                icon={LayersIcon}
                label="Indexed chunks"
                value={
                  doc.status === "processed"
                    ? content.isLoading
                      ? "…"
                      : String(chunks.length)
                    : "—"
                }
              />
              <Fact icon={CalendarPlusIcon} label="Uploaded" value={formatDate(doc.createdAt)} />
              <Fact icon={ClockIcon} label="Last updated" value={formatDate(doc.updatedAt)} />
              {doc.ingestAttempts > 1 && (
                <Fact
                  icon={RotateCcwIcon}
                  label="Ingest attempts"
                  value={String(doc.ingestAttempts)}
                />
              )}
            </dl>
          </section>

          {/* Tags + attachments */}
          <section className="space-y-3">
            <SectionLabel>Tags &amp; attachments</SectionLabel>
            {doc.typeNames.length === 0 && doc.repos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No types or repos attached.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {doc.typeNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
                {doc.repos.map((repo) => (
                  <Badge key={repo.repoId} variant="outline" className="gap-1">
                    <GitBranchIcon className="size-3" />
                    {repo.name ?? repo.url ?? repo.repoId}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {/* Extracted content preview — the exact text Ask project retrieves & cites. */}
          <section className="space-y-3">
            <SectionLabel>Extracted content</SectionLabel>
            {doc.status !== "processed" ? (
              <p className="text-sm text-muted-foreground">
                {doc.status === "failed"
                  ? "No content was indexed — fix the error above and retry."
                  : "Still processing. The extracted text will appear here once indexing finishes."}
              </p>
            ) : content.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : content.isError ? (
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load this document&apos;s text.
              </p>
            ) : previewText ? (
              <article className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                {previewText}
              </article>
            ) : (
              <p className="text-sm text-muted-foreground">
                No extracted text is available for this document yet.
              </p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileTextIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
