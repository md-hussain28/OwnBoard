"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { useEffect } from "react";
import { docPackKeys, useDocPackIngestStatus } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { cn } from "@/lib/utils";
import { type UploadJob, useUploadStore } from "@/stores/upload-store";
import { Progress } from "@/ui/progress";

const AUTO_DISMISS_MS = 8_000;

function summaryIcon(activeCount: number, failedCount: number) {
  if (activeCount > 0) {
    return <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />;
  }
  if (failedCount > 0) {
    return <AlertCircleIcon className="size-4 shrink-0 text-destructive" />;
  }
  return <CheckCircle2Icon className="size-4 shrink-0 text-brand-moss" />;
}

function summaryLabel(activeCount: number, failedCount: number) {
  if (activeCount > 0) {
    return `Processing ${activeCount} upload${activeCount > 1 ? "s" : ""}…`;
  }
  if (failedCount > 0) return "Some uploads failed";
  return "Uploads complete";
}

/**
 * Floating "minimized player" for background document uploads: shows transfer progress,
 * then live ingestion progress (via the cheap status poll), and a success/failure
 * notification when a pack finishes. Mounted once in the console layout, so uploads
 * keep going — and stay visible — while the user navigates elsewhere.
 */
export function UploadProgressWidget() {
  const jobs = useUploadStore((s) => s.jobs);
  const minimized = useUploadStore((s) => s.minimized);
  const toggleMinimized = useUploadStore((s) => s.toggleMinimized);

  if (jobs.length === 0) return null;

  const activeCount = jobs.filter(
    (j) => j.phase === "uploading" || j.phase === "processing",
  ).length;
  const failedCount = jobs.filter((j) => j.phase === "failed").length;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Document upload progress"
      className="fixed right-4 bottom-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-background shadow-lg"
    >
      <button
        type="button"
        onClick={toggleMinimized}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={!minimized}
      >
        {summaryIcon(activeCount, failedCount)}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {summaryLabel(activeCount, failedCount)}
        </span>
        {minimized ? (
          <ChevronUpIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {!minimized && (
        <ul className="max-h-72 space-y-3 overflow-y-auto border-t border-border px-4 py-3">
          {jobs.map((job) => (
            <UploadJobRow key={job.id} job={job} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function UploadJobRow({ job }: { job: UploadJob }) {
  const queryClient = useQueryClient();
  const markJob = useUploadStore((s) => s.markJob);
  const dismissJob = useUploadStore((s) => s.dismissJob);

  const { data: status } = useDocPackIngestStatus(job.packId, job.phase === "processing");

  // Resolve the job once every one of its documents reaches a terminal status.
  useEffect(() => {
    if (job.phase !== "processing" || !status) return;
    const mine = status.documents.filter((d) => job.documentIds.includes(d.id));
    if (mine.length === 0) return;
    const failed = mine.filter((d) => d.status === "failed");
    const done = mine.every((d) => d.status === "processed" || d.status === "failed");
    if (!done) return;
    markJob(
      job.id,
      failed.length > 0
        ? {
            phase: "failed",
            error:
              failed[0]?.errorMessage ??
              `${failed.length} of ${mine.length} document${mine.length > 1 ? "s" : ""} failed to process.`,
          }
        : { phase: "complete" },
    );
    // Pull the processed statuses/page counts into the pack view.
    void queryClient.invalidateQueries({ queryKey: docPackKeys.detail(job.packId) });
  }, [job.documentIds, job.id, job.packId, job.phase, markJob, queryClient, status]);

  // Successful jobs dissolve on their own; failures stay until dismissed.
  useEffect(() => {
    if (job.phase !== "complete") return;
    const timer = setTimeout(() => dismissJob(job.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismissJob, job.id, job.phase]);

  const processedInJob =
    status?.documents.filter((d) => job.documentIds.includes(d.id) && d.status === "processed")
      .length ?? 0;

  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium">{job.packName}</p>
        {(job.phase === "complete" || job.phase === "failed") && (
          <button
            type="button"
            aria-label={`Dismiss ${job.packName} upload notification`}
            onClick={() => dismissJob(job.id)}
            className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FileTextIcon className="size-3 shrink-0" />
        <span className="truncate">{job.fileNames.join(", ")}</span>
      </p>

      {job.phase === "uploading" && (
        <div className="flex items-center gap-2">
          <Progress value={job.progress} aria-label="Upload progress" />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {job.progress}%
          </span>
        </div>
      )}

      {job.phase === "processing" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2Icon className="size-3 animate-spin" />
          Processing {processedInJob}/{job.documentIds.length} — quiz generation unlocks when done.
        </p>
      )}

      {job.phase === "complete" && (
        <p className={cn("flex items-center gap-1.5 text-xs font-medium", "text-brand-moss")}>
          <CheckCircle2Icon className="size-3" />
          All documents processed.
        </p>
      )}

      {job.phase === "failed" && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircleIcon className="mt-0.5 size-3 shrink-0" />
          <span>{job.error ?? "Upload failed."}</span>
        </p>
      )}
    </li>
  );
}
