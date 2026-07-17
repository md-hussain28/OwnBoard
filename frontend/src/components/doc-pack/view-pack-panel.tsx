"use client";

import {
  CalendarIcon,
  FileTextIcon,
  FolderIcon,
  GlobeIcon,
  PencilIcon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { useDocPack, useDocPackQuiz } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import type { PackAssignmentProgress } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { usePackAssignments } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { cn } from "@/lib/utils";
import type { DocPack, DocPackListItem } from "@/schemas/docPack.schema";
import type { PackAssignmentStatus } from "@/schemas/packAssignment.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";

const PROGRESS_STRIP: { status: PackAssignmentStatus; tone: string }[] = [
  { status: "assigned", tone: "bg-muted text-muted-foreground" },
  { status: "reading", tone: "bg-brand-info/10 text-brand-info" },
  { status: "ready_for_quiz", tone: "bg-accent text-accent-foreground" },
  { status: "quiz_in_progress", tone: "bg-warning/10 text-warning" },
  { status: "passed", tone: "bg-brand-moss-soft text-brand-moss" },
  { status: "failed", tone: "bg-brand-coral-soft text-brand-coral" },
];

const DOC_STATUS_LABEL: Record<DocPack["documents"][number]["status"], string> = {
  uploaded: "Queued",
  processing: "Processing",
  processed: "Processed",
  failed: "Failed",
};

function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function audienceLabel(pack: Pick<DocPackListItem, "assignToAll" | "audienceDomainNames">) {
  if (pack.assignToAll) return "Everyone";
  if (pack.audienceDomainNames.length > 0) return pack.audienceDomainNames.join(", ");
  return "Manual assign only";
}

function assignmentSummary(progress: PackAssignmentProgress | undefined) {
  if (progress?.loading) return null;
  if (!progress || progress.count === 0) return "Not assigned yet";
  return `${progress.text} · ${progress.count} ${progress.count === 1 ? "person" : "people"}`;
}

/**
 * Read-only track summary for the Tracks desk right sheet — name, audience, docs, quiz status.
 * Assign / Edit are exit actions only; nothing here is editable.
 */
export function ViewPackPanel({
  pack: listPack,
  progress,
  onAssign,
  onClose,
  isAdmin = true,
}: {
  pack: DocPackListItem;
  progress: PackAssignmentProgress | undefined;
  onAssign: () => void;
  onClose: () => void;
  isAdmin?: boolean;
}) {
  const detailQuery = useDocPack(listPack.id);
  const quizQuery = useDocPackQuiz(listPack.id);
  const assignmentsQuery = usePackAssignments(listPack.id);
  const employeesQuery = useEmployees({ enabled: isAdmin });
  const pack = detailQuery.data ?? listPack;
  const documents = detailQuery.data?.documents ?? [];
  const assignment = assignmentSummary(progress);
  const quizPublished = quizQuery.data?.isPublished;
  const hasQuiz = Boolean(quizQuery.data);

  const assignments = assignmentsQuery.data ?? [];
  const employeeById = useMemo(
    () => new Map((employeesQuery.data ?? []).map((e) => [e.id, e])),
    [employeesQuery.data],
  );
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<PackAssignmentStatus, number>> = {};
    for (const a of assignments) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return counts;
  }, [assignments]);

  const peopleLoading = isAdmin && (assignmentsQuery.isLoading || employeesQuery.isLoading);
  const peopleError = isAdmin && (assignmentsQuery.isError || employeesQuery.isError);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pb-2">
      {pack.description ? (
        <p className="text-sm text-muted-foreground text-pretty">{pack.description}</p>
      ) : null}

      <ul className="grid gap-1 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
        <DetailRow
          icon={<FolderIcon className="size-3.5" aria-hidden />}
          label="Domain"
          value={pack.domainName?.trim() || "Unassigned"}
        />
        <DetailRow
          icon={
            pack.assignToAll ? (
              <GlobeIcon className="size-3.5" aria-hidden />
            ) : (
              <UsersIcon className="size-3.5" aria-hidden />
            )
          }
          label="Audience"
          value={audienceLabel(pack)}
        />
        {isAdmin && (
          <DetailRow
            icon={<UserPlusIcon className="size-3.5" aria-hidden />}
            label="Assigned"
            value={
              progress?.loading ? (
                <Skeleton className="h-3 w-28" />
              ) : (
                (assignment ?? "Not assigned yet")
              )
            }
          />
        )}
        <DetailRow
          icon={<FileTextIcon className="size-3.5" aria-hidden />}
          label="Quiz"
          value={
            quizQuery.isLoading ? (
              <Skeleton className="h-3 w-24" />
            ) : quizPublished ? (
              "Published"
            ) : hasQuiz ? (
              "Draft"
            ) : (
              "Not generated"
            )
          }
        />
        <DetailRow
          icon={<CalendarIcon className="size-3.5" aria-hidden />}
          label="Created"
          value={formatCreatedAt(pack.createdAt)}
        />
      </ul>

      <section className="space-y-2" aria-labelledby="view-pack-docs">
        <h3 id="view-pack-docs" className="text-sm font-semibold">
          Documents
        </h3>
        {detailQuery.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        )}
        {detailQuery.isError && (
          <p className="text-sm text-muted-foreground">Could not load documents.</p>
        )}
        {!detailQuery.isLoading && !detailQuery.isError && documents.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        )}
        {!detailQuery.isLoading && documents.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start gap-3 px-3 py-2.5">
                <FileTextIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.fileType.toUpperCase()} · {formatSize(doc.fileSizeBytes)}
                    {doc.pageCount ? ` · ${doc.pageCount} pages` : ""} ·{" "}
                    {DOC_STATUS_LABEL[doc.status]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className="space-y-3" aria-labelledby="view-pack-people">
          <h3 id="view-pack-people" className="text-sm font-semibold">
            People
          </h3>

          {peopleLoading && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          )}

          {peopleError && (
            <p className="text-sm text-muted-foreground">Could not load assignments.</p>
          )}

          {!peopleLoading && !peopleError && assignments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No one is assigned yet. Use Assign to add people.
            </p>
          )}

          {!peopleLoading && !peopleError && assignments.length > 0 && (
            <>
              <ul className="flex flex-wrap gap-2" aria-label="Assignment progress">
                {PROGRESS_STRIP.map(({ status, tone }) => {
                  const count = statusCounts[status] ?? 0;
                  if (count === 0) return null;
                  return (
                    <li
                      key={status}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                        tone,
                      )}
                    >
                      <span className="tabular-nums">{count}</span>
                      {ASSIGNMENT_STATUS_LABEL[status]}
                    </li>
                  );
                })}
              </ul>

              <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        <span className="truncate">
                          {employeeById.get(a.employeeId)?.name ?? a.employeeId}
                        </span>
                        {a.autoAssigned && (
                          <Badge variant="outline" className="h-5 shrink-0 gap-1 px-1.5">
                            <SparklesIcon className="size-3" />
                            Auto
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={assignmentStatusVariant(a.status)} className="shrink-0">
                      {ASSIGNMENT_STATUS_LABEL[a.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {isAdmin && (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onAssign();
            }}
          >
            <UserPlusIcon className="size-3.5" aria-hidden />
            Assign
          </Button>
          <Button type="button" size="sm" asChild>
            <Link href={`/app/tracks/${listPack.id}`} onClick={onClose}>
              <PencilIcon className="size-3.5" aria-hidden />
              Edit
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <li className="flex items-baseline gap-2 py-0.5">
      <span className="mt-0.5 shrink-0 self-start text-muted-foreground">{icon}</span>
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-foreground leading-snug">{value}</div>
    </li>
  );
}
