"use client";

import { CheckIcon, GitBranchIcon, PlusIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn, isDraftId } from "@/lib";
import type { ProjectDocType, ProjectRepo } from "@/schemas";
import { Button, Input } from "@/ui";

/**
 * Shared building blocks for document metadata forms — used by both the upload dialog and the
 * edit-document dialog so a doc's fields look and behave identically in both places.
 */

/** A labelled form field: label + optional hint, then the control. */
export function DocField({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
        {hint && (
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

/** A chip that toggles a value in/out of a selection set. */
export function ToggleChip({
  selected,
  onClick,
  icon,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled}
      title={disabled ? "Saving…" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected
          ? "border-primary bg-brand-honey-soft font-medium"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "animate-pulse opacity-60",
      )}
    >
      {selected ? <CheckIcon className="size-3.5 text-primary" /> : icon}
      {children}
    </button>
  );
}

/** Type tags as toggle chips, plus an inline "new type" input at the end of the row. */
export function DocTypePicker({
  types,
  selected,
  onToggle,
  onCreate,
  creating,
}: {
  types: ProjectDocType[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  /** Create a project doc type by name (the caller selects it once the id lands). */
  onCreate: (name: string) => void;
  creating?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {types.map((t) => (
        <ToggleChip
          key={t.id}
          selected={selected.has(t.id)}
          disabled={isDraftId(t.id)}
          onClick={() => onToggle(t.id)}
        >
          {t.name}
        </ToggleChip>
      ))}
      <div className="inline-flex items-center gap-1">
        <Input
          aria-label="New type name"
          placeholder={types.length === 0 ? "Add a type, e.g. PRD" : "New type…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="h-8 w-36 rounded-full border-dashed px-3 text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          aria-label="Add type"
          onClick={submit}
          disabled={creating || !draft.trim()}
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** Project-linked repos as toggle chips; explains itself when the project has no repos yet. */
export function DocRepoPicker({
  repos,
  selected,
  onToggle,
}: {
  repos: ProjectRepo[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (repos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        Link a repository to this project first (Repos tab) to attach docs to it.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {repos.map((repo) => (
        <ToggleChip
          key={repo.repoId}
          selected={selected.has(repo.repoId)}
          disabled={isDraftId(repo.repoId)}
          onClick={() => onToggle(repo.repoId)}
          icon={<GitBranchIcon className="size-3.5 text-muted-foreground" />}
        >
          {repo.name ?? repo.url ?? repo.repoId}
        </ToggleChip>
      ))}
    </div>
  );
}
