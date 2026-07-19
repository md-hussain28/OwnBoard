"use client";

import {
  CheckIcon,
  FileTextIcon,
  GitBranchIcon,
  PlusIcon,
  ScrollTextIcon,
  TagIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { type Dispatch, type ReactNode, type SetStateAction, useRef, useState } from "react";
import { EmptyState, QueryState } from "@/components/shared";
import {
  useCreateDocType,
  useDeleteDocType,
  useDeleteProjectDoc,
  useProjectDocs,
  useSetDocRepos,
  useSetDocTypes,
  useUploadProjectDocs,
} from "@/hooks/queries/project";
import {
  cn,
  MAX_UPLOAD_FILE_SIZE_MB,
  MAX_UPLOAD_FILES_PER_BATCH,
  notify,
  validateFiles,
} from "@/lib";
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
  Spinner,
  Textarea,
} from "@/ui";
import { ProjectSectionHeader } from "./project-section-header";

function statusBadge(status: string) {
  if (status === "processed") return <Badge variant="success">Ready</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Processing…</Badge>;
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

      {manageable && (
        <p className="text-xs text-muted-foreground">
          PDF only, up to {MAX_UPLOAD_FILE_SIZE_MB} MB per file. Uploads are indexed in the
          background.
        </p>
      )}

      {manageable && <TypeManager projectId={projectId} types={types} />}

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
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {documents.map((doc) => (
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
      </QueryState>
    </section>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** A chip that toggles a value in/out of a Set — shared by the type and repo pickers. */
function ToggleChip({
  selected,
  onClick,
  icon,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
        selected ? "border-primary bg-brand-honey-soft" : "border-border hover:bg-muted",
      )}
    >
      {selected ? <CheckIcon className="size-3.5 text-primary" /> : icon}
      {children}
    </button>
  );
}

function UploadDocsDialog({
  projectId,
  types,
  repos,
}: {
  projectId: string;
  types: ProjectDocType[];
  repos: ProjectRepo[];
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [typeIds, setTypeIds] = useState<Set<string>>(new Set());
  const [repoIds, setRepoIds] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [newType, setNewType] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadProjectDocs(projectId);
  const createType = useCreateDocType(projectId);

  function reset() {
    setFiles([]);
    setTypeIds(new Set());
    setRepoIds(new Set());
    setDescription("");
    setNewType("");
  }

  function handleOpen(next: boolean) {
    if (next) reset();
    setOpen(next);
  }

  function addFiles(incoming: FileList | File[] | null) {
    if (!incoming) return;
    const merged = [...files];
    for (const f of Array.from(incoming)) {
      if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
    }
    const validationError = validateFiles(merged);
    if (validationError) {
      notify.error(validationError);
      return;
    }
    setFiles(merged);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function toggle(setState: Dispatch<SetStateAction<Set<string>>>, id: string) {
    setState((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAddType() {
    const trimmed = newType.trim();
    if (!trimmed) return;
    const existing = types.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setTypeIds((prev) => new Set(prev).add(existing.id));
      setNewType("");
      return;
    }
    createType.mutate(trimmed, {
      onSuccess: (created) => {
        setTypeIds((prev) => new Set(prev).add(created.id));
        setNewType("");
      },
      onError: (err) => notify.apiError(err, "Could not add type"),
    });
  }

  function handleUpload() {
    if (files.length === 0) return;
    upload.mutate(
      {
        files,
        typeIds: Array.from(typeIds),
        repoIds: Array.from(repoIds),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          notify.success("Uploaded", { description: "Indexing in the background…" });
          handleOpen(false);
        },
        onError: (err) => notify.apiError(err, "Could not upload"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadIcon className="size-4" />
          Upload docs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload reference documents</DialogTitle>
          <DialogDescription>
            Tag each upload so the team can find it and Ask project can cite it accurately. Metadata
            applies to every file in this batch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Files */}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex w-full flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
              dragging ? "border-primary bg-brand-honey-soft" : "border-border hover:bg-muted",
            )}
          >
            <UploadIcon className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Choose PDFs or drop them here</span>
            <span className="text-xs text-muted-foreground">
              PDF only, up to {MAX_UPLOAD_FILE_SIZE_MB} MB each · {MAX_UPLOAD_FILES_PER_BATCH} files
              max
            </span>
          </button>

          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((file, i) => (
                <li
                  key={`${file.name}-${file.size}`}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Types */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <TagIcon className="size-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Type</span>
              <span className="text-xs text-muted-foreground">
                — what kind of document is this?
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <ToggleChip
                  key={t.id}
                  selected={typeIds.has(t.id)}
                  onClick={() => toggle(setTypeIds, t.id)}
                >
                  {t.name}
                </ToggleChip>
              ))}
              <div className="inline-flex items-center gap-1.5">
                <Input
                  aria-label="Add a new type"
                  placeholder="Add type (e.g. PRD)"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddType();
                    }
                  }}
                  className="h-8 w-36"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={handleAddType}
                  disabled={createType.isPending || !newType.trim()}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Repos */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <GitBranchIcon className="size-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Repositories</span>
              <span className="text-xs text-muted-foreground">
                — which repos does this document describe?
              </span>
            </div>
            {repos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Link a repository to this project first (Repos tab) to attach docs to it.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {repos.map((repo) => (
                  <ToggleChip
                    key={repo.repoId}
                    selected={repoIds.has(repo.repoId)}
                    onClick={() => toggle(setRepoIds, repo.repoId)}
                    icon={<GitBranchIcon className="size-3.5 text-muted-foreground" />}
                  >
                    {repo.name ?? repo.url ?? repo.repoId}
                  </ToggleChip>
                ))}
              </div>
            )}
          </div>

          {/* Description / RAG context */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Context for Ask project</span>
            <span className="text-xs text-muted-foreground">
              What does this cover and why does it matter? This grounds the document's embeddings,
              so answers cite it more accurately.
            </span>
            <Textarea
              placeholder="e.g. Q3 payments service design — covers idempotency keys, retry policy, and the ledger schema."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={upload.isPending || files.length === 0}>
            {upload.isPending ? <Spinner /> : <UploadIcon className="size-4" />}
            {upload.isPending
              ? "Uploading…"
              : `Upload${files.length > 0 ? ` ${files.length}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Delete ${doc.title}`}
      onClick={() =>
        remove.mutate(doc.id, {
          onSuccess: () => notify.success("Document deleted"),
          onError: (err) => notify.apiError(err, "Could not delete"),
        })
      }
    >
      <Trash2Icon className="size-4" />
    </Button>
  );
}
