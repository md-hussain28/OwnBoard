"use client";

import {
  FileTextIcon,
  GitBranchIcon,
  MoreVerticalIcon,
  PencilLineIcon,
  RotateCcwIcon,
  ScrollTextIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ConfirmDialog,
  EmptyState,
  FilteredEmpty,
  FilterSelect,
  QueryState,
} from "@/components/shared";
import { useDeleteProjectDoc, useProjectDocs, useRetryProjectDoc } from "@/hooks/queries/project";
import { notify } from "@/lib";
import type { ProjectDoc, ProjectDocType, ProjectRepo } from "@/schemas";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from "@/ui";
import { DocDetailSheet } from "./doc-detail-sheet";
import { EditDocDialog } from "./edit-doc-dialog";
import { ProjectSectionHeader } from "./project-section-header";
import { UploadDocsDialog } from "./upload-docs-dialog";

type StatusFilter = "all" | "processed" | "processing" | "failed";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "processed", label: "Ready" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
];

function statusBadge(status: string) {
  if (status === "processed") return <Badge variant="success">Ready</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Processing…</Badge>;
}

/** Maps a document's raw status onto the coarse buckets the status filter offers. */
function statusBucket(status: string): StatusFilter {
  if (status === "processed") return "processed";
  if (status === "failed") return "failed";
  return "processing";
}

export function ProjectDocsPanel({
  projectId,
  manageable,
  repos = [],
}: {
  projectId: string;
  manageable: boolean;
  /** The project's linked repos — a document can be attached to one or more of them. */
  repos?: ProjectRepo[];
}) {
  const { data, isLoading, isError, error } = useProjectDocs(projectId);
  const documents = data?.documents ?? [];
  const types = data?.types ?? [];

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const hasFilters = query.trim().length > 0 || typeFilter !== "all" || statusFilter !== "all";

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "All types" },
      ...types.map((t) => ({ value: t.id, label: t.name })),
    ],
    [types],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (q) {
        const hay = `${doc.title} ${doc.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter !== "all" && !doc.typeIds.includes(typeFilter)) return false;
      if (statusFilter !== "all" && statusBucket(doc.status) !== statusFilter) return false;
      return true;
    });
  }, [documents, query, typeFilter, statusFilter]);

  return (
    <section className="space-y-4">
      <ProjectSectionHeader
        icon={ScrollTextIcon}
        title="Documents"
        description="Reference files (PRDs, KT notes, system design…). Tag each with a type and attach it to the repos it documents. Uploaded docs are indexed for Ask project."
        action={
          manageable ? (
            <UploadDocsDialog projectId={projectId} types={types} repos={repos} />
          ) : undefined
        }
      />

      {documents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search documents"
              placeholder="Search documents by title or context…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {types.length > 0 && (
            <FilterSelect
              aria-label="Filter by type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeOptions}
            />
          )}
          <FilterSelect
            aria-label="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
        </div>
      )}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={documents.length === 0}
        empty={
          <EmptyState
            icon={FileTextIcon}
            tone={manageable ? "honey" : "mist"}
            title="No documents yet"
            description={
              manageable
                ? "Upload PDFs so the team has reference material and Ask project can cite them."
                : "No reference documents have been added to this project yet."
            }
            action={
              manageable ? (
                <UploadDocsDialog projectId={projectId} types={types} repos={repos} />
              ) : undefined
            }
          />
        }
      >
        {visible.length === 0 ? (
          <FilteredEmpty
            noun="documents"
            onClear={
              hasFilters
                ? () => {
                    setQuery("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                  }
                : undefined
            }
          />
        ) : (
          <div role="list" className="overflow-hidden rounded-xl border border-border bg-card">
            {visible.map((doc) => (
              <DocRow
                key={doc.id}
                projectId={projectId}
                doc={doc}
                types={types}
                repos={repos}
                manageable={manageable}
              />
            ))}
          </div>
        )}
      </QueryState>
    </section>
  );
}

/** One document as a scannable table row: identity · type/repo tags · status + a `⋯` menu. */
function DocRow({
  projectId,
  doc,
  types,
  repos,
  manageable,
}: {
  projectId: string;
  doc: ProjectDoc;
  types: ProjectDocType[];
  repos: ProjectRepo[];
  manageable: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const retry = useRetryProjectDoc(projectId);

  function handleRetry() {
    retry.mutate(doc.id, {
      onSuccess: () => notify.info("Retrying document", { description: doc.title }),
      onError: (err) => notify.apiError(err, "Retry failed"),
    });
  }

  return (
    // Clicking anywhere on the row (except the actions menu) opens the detail sheet.
    <div
      role="button"
      tabIndex={0}
      onClick={() => setDetailOpen(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setDetailOpen(true);
        }
      }}
      className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      {/* Identity */}
      <div className="flex min-w-0 flex-[2] items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-coral-soft text-brand-coral">
          <FileTextIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{doc.title}</p>
          {doc.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{doc.description}</p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground/70">No context added</p>
          )}
        </div>
      </div>

      {/* Tags: types + attached repos */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {doc.typeNames.length === 0 && doc.repos.length === 0 ? (
          <span className="text-xs text-muted-foreground">Untagged</span>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Status + actions — its own clicks must not bubble up and open the detail sheet. */}
      <div
        className="ml-auto flex shrink-0 items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {doc.status === "failed" && doc.errorMessage && (
          <span
            title={doc.errorMessage}
            className="hidden max-w-40 truncate text-xs text-destructive sm:inline"
          >
            {doc.errorMessage}
          </span>
        )}
        {statusBadge(doc.status)}

        {manageable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${doc.title}`}>
                <MoreVerticalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {doc.status === "failed" && (
                <>
                  <DropdownMenuItem onSelect={handleRetry} disabled={retry.isPending}>
                    <RotateCcwIcon /> Retry processing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <PencilLineIcon /> Edit document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  // Keep the confirm modal from racing the menu's close/focus handoff.
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
              >
                <Trash2Icon /> Delete document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Detail sheet is available to everyone (viewers included); management actions stay gated. */}
      <DocDetailSheet
        projectId={projectId}
        doc={doc}
        manageable={manageable}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {manageable && (
        <>
          <EditDocDialog
            projectId={projectId}
            doc={doc}
            types={types}
            repos={repos}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteDocConfirm
            projectId={projectId}
            doc={doc}
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
          />
        </>
      )}
    </div>
  );
}

function DeleteDocConfirm({
  projectId,
  doc,
  open,
  onOpenChange,
}: {
  projectId: string;
  doc: ProjectDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const remove = useDeleteProjectDoc(projectId);

  function handleDelete() {
    remove.mutate(doc.id, {
      onSuccess: () => {
        onOpenChange(false);
        notify.success("Document deleted");
      },
      onError: (err) => notify.apiError(err, "Could not delete"),
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this document?"
      description={
        <>
          <span className="font-medium text-foreground">{doc.title}</span> and its indexed content
          will be permanently removed from Ask project. This can't be undone.
        </>
      }
      confirmLabel="Delete"
      pending={remove.isPending}
      onConfirm={handleDelete}
    />
  );
}
