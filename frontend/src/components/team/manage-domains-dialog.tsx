"use client";

import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import {
  useCreateOrgDomain,
  useDeleteOrgDomain,
  useUpdateOrgDomain,
} from "@/hooks/queries/org-domain/org-domain.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
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

function DomainRow({ domain }: { domain: OrgDomain }) {
  const updateDomain = useUpdateOrgDomain();
  const deleteDomain = useDeleteOrgDomain();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(domain.name);
  const inputId = useId();

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
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
      {editing ? (
        <>
          <Input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEditing();
              }
            }}
            aria-label={`Rename ${domain.name}`}
            className="h-8 flex-1"
            autoFocus
            disabled={updateDomain.isPending}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Save name"
            disabled={updateDomain.isPending || !draft.trim()}
            onClick={save}
          >
            <CheckIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel rename"
            disabled={updateDomain.isPending}
            onClick={cancelEditing}
          >
            <XIcon className="size-3.5" />
          </Button>
        </>
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
              onClick={() => deleteDomain.mutate(domain.id)}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          )}
        </>
      )}
      {updateDomain.isError && (
        <p className="basis-full text-xs text-destructive">
          {getApiErrorMessage(updateDomain.error)}
        </p>
      )}
      {deleteDomain.isError && (
        <p className="basis-full text-xs text-destructive">
          {getApiErrorMessage(deleteDomain.error)}
        </p>
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
        onSuccess: () => setName(""),
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

        {createDomain.isError && (
          <p className="text-sm text-destructive">{getApiErrorMessage(createDomain.error)}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
