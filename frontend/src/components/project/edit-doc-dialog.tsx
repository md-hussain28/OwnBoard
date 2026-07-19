"use client";

import { useState } from "react";
import { useCreateDocType, useUpdateProjectDoc } from "@/hooks/queries/project";
import { isDraftId, notify } from "@/lib";
import type { ProjectDoc, ProjectDocType, ProjectRepo } from "@/schemas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
  Textarea,
} from "@/ui";
import { DocField, DocRepoPicker, DocTypePicker } from "./doc-metadata-fields";

function sameSet(a: Set<string>, b: string[]) {
  return a.size === b.length && b.every((id) => a.has(id));
}

/**
 * Full metadata editor for one reference document — name, context, type tags, and repo
 * attachments in a single dialog, saved as one PATCH (only the fields that changed are sent).
 */
export function EditDocDialog({
  projectId,
  doc,
  types,
  repos,
  open,
  onOpenChange,
}: {
  projectId: string;
  doc: ProjectDoc;
  types: ProjectDocType[];
  repos: ProjectRepo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(doc.description ?? "");
  const [typeIds, setTypeIds] = useState<Set<string>>(new Set(doc.typeIds));
  const [repoIds, setRepoIds] = useState<Set<string>>(new Set(doc.repoIds));

  const update = useUpdateProjectDoc(projectId);
  const createType = useCreateDocType(projectId);

  function handleOpen(next: boolean) {
    if (next) {
      setTitle(doc.title);
      setDescription(doc.description ?? "");
      setTypeIds(new Set(doc.typeIds));
      setRepoIds(new Set(doc.repoIds));
    }
    onOpenChange(next);
  }

  function toggle(setState: typeof setTypeIds, id: string) {
    setState((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleCreateType(name: string) {
    const existing = types.find(
      (t) => !isDraftId(t.id) && t.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      setTypeIds((prev) => new Set(prev).add(existing.id));
      return;
    }
    if (types.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    createType.mutate(name, {
      onSuccess: (created) => setTypeIds((prev) => new Set(prev).add(created.id)),
      onError: (err) => notify.apiError(err, "Could not add type"),
    });
  }

  function handleSave() {
    const cleanedTitle = title.trim();
    if (!cleanedTitle) return;

    const nextTypeIds = Array.from(typeIds).filter((id) => !isDraftId(id));
    const nextRepoIds = Array.from(repoIds).filter((id) => !isDraftId(id));
    const changes: {
      title?: string;
      description?: string;
      typeIds?: string[];
      repoIds?: string[];
    } = {};
    if (cleanedTitle !== doc.title) changes.title = cleanedTitle;
    if (description.trim() !== (doc.description ?? "")) changes.description = description;
    if (!sameSet(new Set(doc.typeIds), nextTypeIds)) changes.typeIds = nextTypeIds;
    if (!sameSet(new Set(doc.repoIds), nextRepoIds)) changes.repoIds = nextRepoIds;

    if (Object.keys(changes).length === 0) {
      onOpenChange(false);
      return;
    }
    update.mutate(
      { documentId: doc.id, ...changes },
      {
        onSuccess: () => {
          onOpenChange(false);
          notify.success("Document updated");
        },
        onError: (err) => notify.apiError(err, "Could not update document"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border p-5 pr-12">
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Update how <span className="font-medium text-foreground">{doc.title}</span> is named,
            tagged, and attached. Ask project uses this context when citing it.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex-1 space-y-5 overflow-y-auto p-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <DocField label="Name" htmlFor={`doc-title-${doc.id}`}>
            <Input
              id={`doc-title-${doc.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Payments Service PRD"
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
            htmlFor={`doc-context-${doc.id}`}
          >
            <Textarea
              id={`doc-context-${doc.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Q3 payments service design — covers idempotency keys, retry policy, and the ledger schema."
              rows={3}
            />
          </DocField>
        </form>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-border p-5">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || !title.trim()}>
            {update.isPending && <Spinner />}
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
