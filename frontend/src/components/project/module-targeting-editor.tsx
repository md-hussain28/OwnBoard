"use client";

import { CheckIcon, GitBranchIcon, PlusIcon, UsersRoundIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cn, isDraftId } from "@/lib";
import type { ProjectFunctionType, ProjectRepo, ProjectTrack, TrackRepoRuleInput } from "@/schemas";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  SheetFooter,
  Spinner,
} from "@/ui";

const NO_DOMAIN = "__any__";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

export type EditorOutput = {
  targetAllMembers: boolean;
  domainIds: string[];
  repoRules: TrackRepoRuleInput[];
  manualEmployeeIds: string[];
};

type RepoRuleDraft = { repoId: string; domainId: string | null };

type EditorMember = {
  employeeId: string;
  name: string;
  functionTypeName: string | null;
  role: string | null;
};

/** Toggleable chip per project domain; draft (`new_…`) domains stay disabled until saved. */
function DomainChips({
  functionTypes,
  domainIds,
  onToggle,
}: {
  functionTypes: ProjectFunctionType[];
  domainIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (functionTypes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No domains defined for this project yet.</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {functionTypes.map((t) => {
        const on = domainIds.has(t.id);
        const saving = isDraftId(t.id);
        return (
          <button
            key={t.id}
            type="button"
            disabled={saving}
            title={saving ? "Saving…" : undefined}
            onClick={() => onToggle(t.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
              on
                ? "border-primary bg-brand-honey-soft text-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
              saving && "animate-pulse opacity-60",
            )}
          >
            {on && <CheckIcon className="size-3" />}
            {t.name}
            {saving && "…"}
          </button>
        );
      })}
    </div>
  );
}

/** Existing repo rules + the "repo × domain" add row. */
function RepoRulesEditor({
  repos,
  functionTypes,
  repoRules,
  onChange,
}: {
  repos: ProjectRepo[];
  functionTypes: ProjectFunctionType[];
  repoRules: RepoRuleDraft[];
  onChange: (rules: RepoRuleDraft[]) => void;
}) {
  const [newRepoId, setNewRepoId] = useState("");
  const [newRepoDomain, setNewRepoDomain] = useState(NO_DOMAIN);

  const domainName = useMemo(
    () => new Map(functionTypes.map((t) => [t.id, t.name])),
    [functionTypes],
  );
  const repoName = useMemo(
    () => new Map(repos.map((r) => [r.repoId, r.name ?? r.repoId])),
    [repos],
  );

  function addRepoRule() {
    if (!newRepoId) return;
    const domainId = newRepoDomain === NO_DOMAIN ? null : newRepoDomain;
    if (!repoRules.some((r) => r.repoId === newRepoId && r.domainId === domainId)) {
      onChange([...repoRules, { repoId: newRepoId, domainId }]);
    }
    setNewRepoId("");
    setNewRepoDomain(NO_DOMAIN);
  }

  return (
    <div className="space-y-2">
      <SectionLabel>People working on a repo</SectionLabel>
      {repoRules.length > 0 && (
        <ul className="space-y-1">
          {repoRules.map((r) => (
            <li
              key={`${r.repoId}:${r.domainId ?? ""}`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              <GitBranchIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{repoName.get(r.repoId) ?? r.repoId}</span>
              <span className="text-xs text-muted-foreground">
                {r.domainId ? domainName.get(r.domainId) : "anyone"}
              </span>
              <button
                type="button"
                aria-label="Remove rule"
                onClick={() => onChange(repoRules.filter((x) => x !== r))}
                className="text-muted-foreground hover:text-destructive"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {repos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Link a repo to this project to use this.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={newRepoId} onValueChange={setNewRepoId}>
            <SelectTrigger className="min-w-36 flex-1">
              <SelectValue placeholder="Repo…" />
            </SelectTrigger>
            <SelectContent>
              {repos.map((r) => (
                <SelectItem key={r.repoId} value={r.repoId} disabled={isDraftId(r.repoId)}>
                  {r.name ?? r.repoId}
                  {isDraftId(r.repoId) ? " (saving…)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newRepoDomain} onValueChange={setNewRepoDomain}>
            <SelectTrigger className="min-w-32 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DOMAIN}>Anyone</SelectItem>
              {functionTypes.map((t) => (
                <SelectItem key={t.id} value={t.id} disabled={isDraftId(t.id)}>
                  {t.name}
                  {isDraftId(t.id) ? " (saving…)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addRepoRule}
            disabled={!newRepoId}
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** Hand-pick individual members regardless of the rule-based audience. */
function MemberPicker({
  members,
  manualIds,
  onToggle,
}: {
  members: EditorMember[];
  manualIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="max-h-56 space-y-1 overflow-y-auto">
      {members.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No members yet.</p>
      )}
      {members.map((m) => {
        const on = manualIds.has(m.employeeId);
        return (
          <button
            type="button"
            key={m.employeeId}
            onClick={() => onToggle(m.employeeId)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
              on ? "border-primary bg-brand-honey-soft" : "border-border hover:bg-muted",
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.functionTypeName ?? m.role ?? "Member"}
              </p>
            </div>
            {on && <CheckIcon className="size-4 shrink-0 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}

/** The combinable targeting builder — everyone / domains / repo rules / hand-picked people, unioned. */
export function TargetingEditor({
  track,
  functionTypes,
  repos,
  members,
  saving,
  onCancel,
  onSave,
}: {
  track: ProjectTrack;
  functionTypes: ProjectFunctionType[];
  repos: ProjectRepo[];
  members: EditorMember[];
  saving: boolean;
  onCancel: () => void;
  onSave: (input: EditorOutput) => void;
}) {
  const [targetAll, setTargetAll] = useState(track.targetAllMembers);
  const [domainIds, setDomainIds] = useState<Set<string>>(new Set(track.domainIds));
  const [repoRules, setRepoRules] = useState<RepoRuleDraft[]>(
    track.repoRules.map((r) => ({ repoId: r.repoId, domainId: r.domainId })),
  );
  const [manualIds, setManualIds] = useState<Set<string>>(new Set(track.manualEmployeeIds));

  function toggleIn(setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
    return (id: string) =>
      setter((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
  }

  function handleSave() {
    // Drop client `new_…` draft ids (a domain/repo still being created) — the backend
    // can't resolve them and would reject the whole assignment.
    onSave({
      targetAllMembers: targetAll,
      domainIds: [...domainIds].filter((id) => !isDraftId(id)),
      repoRules: repoRules
        .filter((r) => !isDraftId(r.repoId) && !isDraftId(r.domainId ?? ""))
        .map((r) => ({ repoId: r.repoId, domainId: r.domainId })),
      manualEmployeeIds: [...manualIds],
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <p className="text-xs text-muted-foreground">
          The audience is everyone matched by <span className="font-medium">any</span> of the rules
          below — combine as many as you need.
        </p>

        {/* Everyone */}
        <button
          type="button"
          onClick={() => setTargetAll((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
            targetAll ? "border-primary bg-brand-honey-soft" : "border-border hover:bg-muted",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <UsersRoundIcon className="size-4" /> Everyone on this project
          </span>
          {targetAll && <CheckIcon className="size-4 text-primary" />}
        </button>

        <Separator />

        <div className="space-y-2">
          <SectionLabel>Needed for domains</SectionLabel>
          <DomainChips
            functionTypes={functionTypes}
            domainIds={domainIds}
            onToggle={toggleIn(setDomainIds)}
          />
        </div>

        <Separator />

        <RepoRulesEditor
          repos={repos}
          functionTypes={functionTypes}
          repoRules={repoRules}
          onChange={setRepoRules}
        />

        <Separator />

        <div className="space-y-2">
          <SectionLabel>Also assign specific people ({manualIds.size})</SectionLabel>
          <MemberPicker members={members} manualIds={manualIds} onToggle={toggleIn(setManualIds)} />
        </div>
      </div>

      <SheetFooter className="shrink-0 flex-row gap-2 border-t bg-muted/30">
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving && <Spinner />}
          {saving ? "Saving..." : "Save targeting"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </SheetFooter>
    </div>
  );
}
