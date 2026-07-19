"use client";

import {
  CheckIcon,
  FileTextIcon,
  GitBranchIcon,
  PlusIcon,
  ScrollTextIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ConfirmDialog,
  EmptyState,
  FilteredEmpty,
  FilterSelect,
  QueryState,
} from "@/components/shared";
import {
  useCreateDocType,
  useDeleteDocType,
  useDeleteProjectDoc,
  useProjectDocs,
  useSetDocRepos,
  useSetDocTypes,
} from "@/hooks/queries/project";
import { cn, notify } from "@/lib";
import type { ProjectDoc, ProjectDocType, ProjectRepo } from "@/schemas";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@/ui";
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

      {manageable && <TypeManager projectId={projectId} types={types} />}

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
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {visible.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  {doc.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {doc.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
                    {doc.status === "failed" && doc.errorMessage && (
                      <span className="text-xs text-destructive">{doc.errorMessage}</span>
                    )}
                  </div>
                </div>
                {statusBadge(doc.status)}
                {manageable && (
                  <>
                    <DocReposDialog projectId={projectId} doc={doc} repos={repos} />
                    <DocTypesDialog projectId={projectId} doc={doc} types={types} />
                    <DeleteDocButton projectId={projectId} doc={doc} />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}

function TypeManager({ projectId, types }: { projectId: string; types: ProjectDocType[] }) {
  const [name, setName] = useState("");
  const create = useCreateDocType(projectId);
  const remove = useDeleteDocType(projectId);

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(trimmed, {
      onSuccess: () => setName(""),
      onError: (err) => notify.apiError(err, "Could not add type"),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <TagIcon className="size-3.5" /> Types
      </span>
      {types.map((t) => (
        <Badge key={t.id} variant="outline" className="gap-1">
          {t.name}
          <button
            type="button"
            aria-label={`Delete type ${t.name}`}
            onClick={() =>
              remove.mutate(t.id, {
                onError: (err) => notify.apiError(err, "Could not delete type"),
              })
            }
            className="text-muted-foreground hover:text-destructive"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <div className="flex items-center gap-1.5">
        <Input
          aria-label="New type name"
          placeholder="Add type (e.g. PRD)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          className="h-8 w-40"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCreate}
          disabled={create.isPending || !name.trim()}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function DocTypesDialog({
  projectId,
  doc,
  types,
}: {
  projectId: string;
  doc: ProjectDoc;
  types: ProjectDocType[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(doc.typeIds));
  const save = useSetDocTypes(projectId);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleOpen(next: boolean) {
    if (next) setSelected(new Set(doc.typeIds));
    setOpen(next);
  }

  function handleSave() {
    save.mutate(
      { documentId: doc.id, typeIds: Array.from(selected) },
      {
        onSuccess: () => setOpen(false),
        onError: (err) => notify.apiError(err, "Could not update types"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Edit types">
          <TagIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Document types</DialogTitle>
          <DialogDescription>
            Tag <span className="font-medium">{doc.title}</span> with one or more types.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 py-2">
          {types.length === 0 && (
            <p className="text-sm text-muted-foreground">Add types above first.</p>
          )}
          {types.map((t) => {
            const isSel = selected.has(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                  isSel ? "border-primary bg-brand-honey-soft" : "border-border hover:bg-muted",
                )}
              >
                {isSel && <CheckIcon className="size-3.5 text-primary" />}
                {t.name}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocReposDialog({
  projectId,
  doc,
  repos,
}: {
  projectId: string;
  doc: ProjectDoc;
  repos: ProjectRepo[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(doc.repoIds));
  const save = useSetDocRepos(projectId);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleOpen(next: boolean) {
    if (next) setSelected(new Set(doc.repoIds));
    setOpen(next);
  }

  function handleSave() {
    save.mutate(
      { documentId: doc.id, repoIds: Array.from(selected) },
      {
        onSuccess: () => setOpen(false),
        onError: (err) => notify.apiError(err, "Could not update repos"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Attach to repos">
          <GitBranchIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach to repos</DialogTitle>
          <DialogDescription>
            Link <span className="font-medium">{doc.title}</span> to the repositories it documents.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 py-2">
          {repos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Link a repository to this project first (Repos tab).
            </p>
          )}
          {repos.map((repo) => {
            const isSel = selected.has(repo.repoId);
            return (
              <button
                type="button"
                key={repo.repoId}
                onClick={() => toggle(repo.repoId)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                  isSel ? "border-primary bg-brand-honey-soft" : "border-border hover:bg-muted",
                )}
              >
                {isSel ? (
                  <CheckIcon className="size-3.5 text-primary" />
                ) : (
                  <GitBranchIcon className="size-3.5 text-muted-foreground" />
                )}
                {repo.name ?? repo.url ?? repo.repoId}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDocButton({ projectId, doc }: { projectId: string; doc: ProjectDoc }) {
  const remove = useDeleteProjectDoc(projectId);
  const [open, setOpen] = useState(false);

  function handleDelete() {
    remove.mutate(doc.id, {
      onSuccess: () => {
        setOpen(false);
        notify.success("Document deleted");
      },
      onError: (err) => notify.apiError(err, "Could not delete"),
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Delete ${doc.title}`}>
          <Trash2Icon className="size-4" />
        </Button>
      }
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
