"use client";

import {
  CheckIcon,
  FileTextIcon,
  GitBranchIcon,
  PlusIcon,
  ScrollTextIcon,
  TagIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { type Dispatch, type ReactNode, type SetStateAction, useRef, useState } from "react";
import { useCreateDocType, useUploadProjectDocs } from "@/hooks/queries/project";
import {
  cn,
  MAX_UPLOAD_FILE_SIZE_MB,
  MAX_UPLOAD_FILES_PER_BATCH,
  notify,
  validateFiles,
} from "@/lib";
import type { ProjectDocType, ProjectRepo } from "@/schemas";
import {
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

/** A labelled field block inside the upload dialog — keeps every step visually consistent. */
function UploadField({
  step,
  icon: Icon,
  title,
  hint,
  children,
}: {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
          {step}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Icon className="size-3.5 text-muted-foreground" />
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Batch PDF upload for a project's reference docs. Metadata (type, repos, context) applies to
 * every file in the batch and is laid out as four numbered steps so the flow reads top-to-bottom.
 */
export function UploadDocsDialog({
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
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border p-5 pr-12">
          <DialogTitle>Upload reference documents</DialogTitle>
          <DialogDescription>
            Metadata applies to every file in this batch. Tag it well so the team can find it and
            Ask project cites it accurately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* 1 · Files */}
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
          <UploadField
            step={1}
            icon={UploadIcon}
            title="Files"
            hint={`PDF only · up to ${MAX_UPLOAD_FILE_SIZE_MB} MB each · ${MAX_UPLOAD_FILES_PER_BATCH} files max`}
          >
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
                "flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
                dragging
                  ? "border-primary bg-brand-honey-soft"
                  : "border-border hover:border-primary/40 hover:bg-muted/60",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-honey-soft text-brand-honey">
                <UploadIcon className="size-5" />
              </span>
              <span className="text-sm font-medium">
                {files.length > 0 ? "Add more, or drop them here" : "Choose PDFs or drop them here"}
              </span>
              <span className="text-xs text-muted-foreground">Click to browse your device</span>
            </button>

            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <FileTextIcon className="size-4 shrink-0 text-brand-coral" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </UploadField>

          {/* 2 · Type */}
          <UploadField step={2} icon={TagIcon} title="Type" hint="What kind of document is this?">
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
          </UploadField>

          {/* 3 · Repositories */}
          <UploadField
            step={3}
            icon={GitBranchIcon}
            title="Repositories"
            hint="Which repos does this document describe?"
          >
            {repos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
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
          </UploadField>

          {/* 4 · Context */}
          <UploadField
            step={4}
            icon={ScrollTextIcon}
            title="Context for Ask project"
            hint="What it covers and why it matters — this grounds the embeddings, so answers cite it more accurately."
          >
            <Textarea
              placeholder="e.g. Q3 payments service design — covers idempotency keys, retry policy, and the ledger schema."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </UploadField>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-border p-5">
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
