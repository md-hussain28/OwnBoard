"use client";

import { FileTextIcon, UploadIcon, XIcon } from "lucide-react";
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { useCreateDocType, useUploadProjectDocs } from "@/hooks/queries/project";
import {
  cn,
  isDraftId,
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
import { DocField, DocRepoPicker, DocTypePicker } from "./doc-metadata-fields";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Batch PDF upload for a project's reference docs. Files come first (they're the point of the
 * dialog), then a single "details" section — name, type, repos, context — that applies to every
 * file in the batch.
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
  const [name, setName] = useState("");
  const [typeIds, setTypeIds] = useState<Set<string>>(new Set());
  const [repoIds, setRepoIds] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadProjectDocs(projectId);
  const createType = useCreateDocType(projectId);

  function reset() {
    setFiles([]);
    setName("");
    setTypeIds(new Set());
    setRepoIds(new Set());
    setDescription("");
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

  function handleCreateType(typeName: string) {
    // A name-matched draft type (`new_…`) has no backend id yet — skip selecting it; the
    // real id lands via the create mutation's reconcile.
    const existing = types.find(
      (t) => !isDraftId(t.id) && t.name.toLowerCase() === typeName.toLowerCase(),
    );
    if (existing) {
      setTypeIds((prev) => new Set(prev).add(existing.id));
      return;
    }
    if (types.some((t) => t.name.toLowerCase() === typeName.toLowerCase())) return;
    createType.mutate(typeName, {
      onSuccess: (created) => setTypeIds((prev) => new Set(prev).add(created.id)),
      onError: (err) => notify.apiError(err, "Could not add type"),
    });
  }

  function handleUpload() {
    if (files.length === 0) return;
    upload.mutate(
      {
        files,
        name: name.trim() || undefined,
        typeIds: Array.from(typeIds).filter((id) => !isDraftId(id)),
        repoIds: Array.from(repoIds).filter((id) => !isDraftId(id)),
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

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadIcon className="size-4" />
          Upload docs
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border p-5 pr-12">
          <DialogTitle>Upload reference documents</DialogTitle>
          <DialogDescription>
            Docs are indexed for Ask project. Tag them well so the team can find them and answers
            cite them accurately.
          </DialogDescription>
        </DialogHeader>

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

        <div className="flex-1 overflow-y-auto">
          {/* Files — the reason the dialog exists, so it leads. */}
          <div className="space-y-3 p-5">
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
                "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-colors",
                dragging
                  ? "border-primary bg-brand-honey-soft"
                  : "border-border hover:border-primary/40 hover:bg-muted/60",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-honey-soft text-brand-honey">
                <UploadIcon className="size-5" />
              </span>
              <span className="text-sm font-medium">
                {files.length > 0 ? "Add more PDFs" : "Drop PDFs here, or click to browse"}
              </span>
              <span className="text-xs text-muted-foreground">
                Up to {MAX_UPLOAD_FILES_PER_BATCH} files · {MAX_UPLOAD_FILE_SIZE_MB} MB each
              </span>
            </button>

            {files.length > 0 && (
              <ul className="max-h-40 space-y-1.5 overflow-y-auto">
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
                      className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Details — one block of metadata applied to every file in the batch. */}
          <div className="space-y-5 border-t border-border bg-muted/30 p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Details below apply to every file in this batch.
            </p>

            <DocField label="Name" htmlFor="upload-doc-name">
              <Input
                id="upload-doc-name"
                placeholder={
                  files.length === 1
                    ? files[0].name.replace(/\.pdf$/i, "")
                    : "e.g. Payments Service PRD"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </DocField>

            <DocField label="Type" hint="What kind of document is this?">
              <DocTypePicker
                types={types}
                selected={typeIds}
                onToggle={(id) => toggle(setTypeIds, id)}
                onCreate={handleCreateType}
                creating={createType.isPending}
              />
            </DocField>

            <DocField label="Repositories" hint="Which repos does this document describe?">
              <DocRepoPicker
                repos={repos}
                selected={repoIds}
                onToggle={(id) => toggle(setRepoIds, id)}
              />
            </DocField>

            <DocField
              label="Context for Ask project"
              hint="What it covers and why it matters — grounds the answers that cite it."
              htmlFor="upload-doc-context"
            >
              <Textarea
                id="upload-doc-context"
                placeholder="e.g. Q3 payments service design — covers idempotency keys, retry policy, and the ledger schema."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </DocField>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 items-center rounded-none border-t border-border p-5 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {files.length === 0
              ? "No files selected yet"
              : `${files.length} ${files.length === 1 ? "file" : "files"} · ${formatBytes(totalBytes)}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleOpen(false)} disabled={upload.isPending}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={upload.isPending || files.length === 0}>
              {upload.isPending ? <Spinner /> : <UploadIcon className="size-4" />}
              {upload.isPending
                ? "Uploading…"
                : `Upload${files.length > 0 ? ` ${files.length}` : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
