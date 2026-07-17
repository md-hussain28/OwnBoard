"use client";

import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import {
  useCreateOrgDomain,
  useDeleteOrgDomain,
  useUpdateOrgDomain,
} from "@/hooks/queries/org-domain/org-domain.queries";
import { notify } from "@/lib/toast";
import type { OrgDomain } from "@/schemas/org-domain.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";

/** Inline rename controls for a domain row: input + save/cancel buttons. */
function DomainNameEditor({
  domainName,
  draft,
  onDraftChange,
  onSave,
  onCancel,
  pending,
}: {
  domainName: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const inputId = useId();
  return (
    <>
      <Input
        id={inputId}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSave();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        aria-label={`Rename ${domainName}`}
        className="h-8 flex-1"
        autoFocus
        disabled={pending}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Save name"
        disabled={pending || !draft.trim()}
        onClick={onSave}
      >
        <CheckIcon className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Cancel rename"
        disabled={pending}
        onClick={onCancel}
      >
        <XIcon className="size-3.5" />
      </Button>
    </>
  );
}

function DomainRow({ domain }: { domain: OrgDomain }) {
  const updateDomain = useUpdateOrgDomain();
  const deleteDomain = useDeleteOrgDomain();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(domain.name);

  useEffect(() => {
    if (!editing) setDraft(domain.name);
  }, [domain.name, editing]);

  function startEditing() {
    setDraft(domain.name);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(domain.name);
    setEditing(false);
    updateDomain.reset();
  }

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed === domain.name) {
      setEditing(false);
      return;
    }
    updateDomain.mutate(
      { id: domain.id, input: { name: trimmed } },
      {
        onSuccess: () => {
          notify.success("Domain renamed", { description: trimmed, id: `domain:${domain.id}` });
          setEditing(false);
        },
        onError: (err) => {
          notify.apiError(err, "Could not rename domain", { id: `domain-error:${domain.id}` });
        },
      },
    );
  }

  function handleDelete() {
    deleteDomain.mutate(domain.id, {
      onSuccess: () => {
        notify.success("Domain removed", {
          description: domain.name,
          id: `domain-del:${domain.id}`,
        });
      },
      onError: (err) => {
        notify.apiError(err, "Could not delete domain", { id: `domain-del-error:${domain.id}` });
      },
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
      {editing ? (
        <DomainNameEditor
          domainName={domain.name}
          draft={draft}
          onDraftChange={setDraft}
          onSave={save}
          onCancel={cancelEditing}
          pending={updateDomain.isPending}
        />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{domain.name}</span>
          {domain.isDefault && (
            <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[0.625rem]">
              Built-in
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Rename ${domain.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={startEditing}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          {!domain.isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${domain.name}`}
              className="text-muted-foreground hover:text-destructive"
              disabled={deleteDomain.isPending}
              onClick={handleDelete}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          )}
        </>
      )}
    </li>
  );
}

export function ManageDomainsDialog({
  open,
  onOpenChange,
  domains,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: OrgDomain[];
}) {
  const createDomain = useCreateOrgDomain();
  const formId = useId();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
  }, [open]);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createDomain.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          notify.success("Domain added", { description: trimmed, id: `domain-add:${trimmed}` });
          setName("");
        },
        onError: (err) => {
          notify.apiError(err, "Could not add domain", { id: `domain-add-error:${trimmed}` });
        },
      },
    );
  }

  function handleOpenChange(next: boolean) {
    if (!next) createDomain.reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Manage domains</DialogTitle>
          <DialogDescription>
            Labels for people on your team (Design, Engineering, …). Rename freely — built-ins can’t
            be deleted.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[min(24rem,50vh)] space-y-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
          {domains.map((domain) => (
            <DomainRow key={domain.id} domain={domain} />
          ))}
        </ul>

        <form
          id={formId}
          onSubmit={handleCreate}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a custom domain…"
            aria-label="New domain name"
            className="sm:flex-1"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={createDomain.isPending || !name.trim()}
          >
            <PlusIcon className="size-4" />
            {createDomain.isPending ? "Adding…" : "Add"}
          </Button>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
