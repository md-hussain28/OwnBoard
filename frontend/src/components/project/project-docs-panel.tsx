"use client";

import {
  CheckIcon,
  FileTextIcon,
  PlusIcon,
  ScrollTextIcon,
  TagIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { QueryState } from "@/components/shared/query-state";
import { useProjectDocs } from "@/hooks/queries/project/project.queries";
import {
  useCreateDocType,
  useDeleteDocType,
  useDeleteProjectDoc,
  useSetDocTypes,
  useUploadProjectDocs,
} from "@/hooks/queries/project/project-docs.mutations";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ProjectDoc, ProjectDocType } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Spinner } from "@/ui/spinner";
import { ProjectSectionHeader } from "./project-section-header";

function statusBadge(status: string) {
  if (status === "processed") return <Badge variant="success">Ready</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="warning">Processing…</Badge>;
}

export function ProjectDocsPanel({
  projectId,
  manageable,
}: {
  projectId: string;
  manageable: boolean;
}) {
  const { data, isLoading, isError, error } = useProjectDocs(projectId);
  const documents = data?.documents ?? [];
  const types = data?.types ?? [];

  return (
    <section className="space-y-4">
      <ProjectSectionHeader
        icon={ScrollTextIcon}
        title="Documents"
        description="Reference files (PRDs, KT notes, system design…). Uploaded docs are indexed and become the knowledge base for Ask project."
        action={manageable ? <UploadButton projectId={projectId} /> : undefined}
      />

      {manageable && <TypeManager projectId={projectId} types={types} />}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={documents.length === 0}
        empty={
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <FileTextIcon className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No documents yet</p>
            <p className="max-w-md text-sm text-pretty text-muted-foreground">
              {manageable
                ? "Upload PDFs so the team has reference material and Ask project can cite them."
                : "No reference documents have been added to this project yet."}
            </p>
          </div>
        }
      >
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
              <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {doc.typeNames.map((name) => (
                    <Badge key={name} variant="secondary">
                      {name}
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

function UploadButton({ projectId }: { projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadProjectDocs(projectId);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    upload.mutate(Array.from(files), {
      onSuccess: () => notify.success("Uploaded", { description: "Indexing in the background…" }),
      onError: (err) => notify.apiError(err, "Could not upload"),
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
        {upload.isPending ? <Spinner /> : <UploadIcon className="size-4" />}
        {upload.isPending ? "Uploading…" : "Upload docs"}
      </Button>
    </>
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
