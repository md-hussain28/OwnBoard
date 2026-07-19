"use client";

import {
  CalendarClockIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  PencilIcon,
  PlusIcon,
  UsersIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useProjectMembers, useSetTrackAssignment } from "@/hooks/queries/project";
import { appPath, cn, isDraftId, notify } from "@/lib";
import type { ProjectFunctionType, ProjectRepo, ProjectTrack, TrackRepoRuleInput } from "@/schemas";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner,
} from "@/ui";

function statusVariant(status: string): "success" | "secondary" | "warning" {
  if (status === "active") return "success";
  if (status === "needs_review") return "warning";
  return "secondary";
}

function statusLabel(status: string): string {
  return status === "active" ? "Published" : status.replace("_", " ");
}

const NO_DOMAIN = "__any__";

/**
 * View-first detail sidebar for one project onboarding module: who it's for and its key facts.
 * Nothing changes until you press Edit — then the combinable targeting builder appears (everyone,
 * selected domains, per-repo rules, and hand-picked people). Quiz authoring stays on its own page.
 */
export function ModuleDetailSheet({
  projectId,
  track,
  functionTypes,
  repos,
  manageable,
  open,
  startEditing = false,
  onOpenChange,
}: {
  projectId: string;
  track: ProjectTrack | null;
  functionTypes: ProjectFunctionType[];
  repos: ProjectRepo[];
  manageable: boolean;
  open: boolean;
  /** Open straight into the targeting editor (the "Assign" action) rather than the calm view. */
  startEditing?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const { data: members } = useProjectMembers(projectId, open);
  const save = useSetTrackAssignment(projectId);

  // Each time the sheet opens (or the track changes) reset to the requested state:
  // the calm view by default, or the targeting editor when opened via "Assign".
  useEffect(() => {
    if (open) setEditing(startEditing && manageable);
  }, [open, startEditing, manageable]);

  if (!track) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="shrink-0 gap-2 pr-10">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <SheetTitle className="min-w-0 flex-1 truncate">{track.name}</SheetTitle>
            <Badge variant={statusVariant(track.status)}>{statusLabel(track.status)}</Badge>
          </div>
          {track.description && (
            <p className="text-sm text-muted-foreground">{track.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {track.estimatedMinutes != null && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="size-3.5" /> {track.estimatedMinutes} min
              </span>
            )}
            {track.dueOffsetDays != null && (
              <span className="inline-flex items-center gap-1">
                <CalendarClockIcon className="size-3.5" /> due in {track.dueOffsetDays} day
                {track.dueOffsetDays === 1 ? "" : "s"}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="size-3.5" /> {track.assignedCount} assigned
            </span>
          </div>
        </SheetHeader>

        {editing ? (
          <TargetingEditor
            track={track}
            functionTypes={functionTypes}
            repos={repos}
            members={members ?? []}
            saving={save.isPending}
            onCancel={() => setEditing(false)}
            onSave={(input) =>
              save.mutate(
                { trackId: track.id, ...input },
                {
                  onSuccess: () => {
                    setEditing(false);
                    notify.success("Targeting updated", { description: track.name });
                  },
                  onError: (err) => notify.apiError(err, "Could not update targeting"),
                },
              )
            }
          />
        ) : (
          <TargetingView
            track={track}
            members={members ?? []}
            manageable={manageable}
            authoringHref={appPath("projects", projectId, "onboarding", track.id)}
            onEdit={() => setEditing(true)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Read-only summary of who the module is for. */
function TargetingView({
  track,
  members,
  manageable,
  authoringHref,
  onEdit,
}: {
  track: ProjectTrack;
  members: { employeeId: string; name: string }[];
  manageable: boolean;
  authoringHref: string;
  onEdit: () => void;
}) {
  const nameById = new Map(members.map((m) => [m.employeeId, m.name]));
  const manualNames = track.manualEmployeeIds.map((id) => nameById.get(id) ?? "Someone");
  const empty =
    !track.targetAllMembers &&
    track.domainNames.length === 0 &&
    track.repoRules.length === 0 &&
    track.manualEmployeeIds.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <SectionLabel>Who it&apos;s for</SectionLabel>
        {empty && (
          <p className="text-sm text-muted-foreground">
            No one yet. Press <span className="font-medium">Edit</span> to choose an audience.
          </p>
        )}

        {track.targetAllMembers && <Row icon={UsersRoundIcon}>Everyone on this project</Row>}

        {track.domainNames.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm">Members in these domains</p>
            <div className="flex flex-wrap gap-1.5">
              {track.domainNames.map((d) => (
                <Badge key={d} variant="secondary">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {track.repoRules.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm">People working on</p>
            <ul className="space-y-1">
              {track.repoRules.map((r) => (
                <li
                  key={`${r.repoId}:${r.domainId ?? ""}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <GitBranchIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{r.repoName ?? r.repoId}</span>
                  <span className="text-xs">· {r.domainName ?? "anyone on the repo"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {manualNames.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm">Also assigned</p>
            <div className="flex flex-wrap gap-1.5">
              {manualNames.map((n, i) => (
                <Badge key={`${n}-${i}`} variant="outline">
                  {n}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <SheetFooter className="shrink-0 flex-row gap-2 border-t bg-muted/30">
        {manageable && (
          <Button variant="outline" className="flex-1" onClick={onEdit}>
            <PencilIcon className="size-4" /> Edit audience
          </Button>
        )}
        <Button asChild variant="ghost" className="flex-1">
          <a href={authoringHref}>
            <ExternalLinkIcon className="size-4" /> Authoring
          </a>
        </Button>
      </SheetFooter>
    </div>
  );
}

type EditorOutput = {
  targetAllMembers: boolean;
  domainIds: string[];
  repoRules: TrackRepoRuleInput[];
  manualEmployeeIds: string[];
};

/** The combinable targeting builder — everyone / domains / repo rules / hand-picked people, unioned. */
function TargetingEditor({
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
  members: {
    employeeId: string;
    name: string;
    functionTypeName: string | null;
    role: string | null;
  }[];
  saving: boolean;
  onCancel: () => void;
  onSave: (input: EditorOutput) => void;
}) {
  const [targetAll, setTargetAll] = useState(track.targetAllMembers);
  const [domainIds, setDomainIds] = useState<Set<string>>(new Set(track.domainIds));
  const [repoRules, setRepoRules] = useState<{ repoId: string; domainId: string | null }[]>(
    track.repoRules.map((r) => ({ repoId: r.repoId, domainId: r.domainId })),
  );
  const [manualIds, setManualIds] = useState<Set<string>>(new Set(track.manualEmployeeIds));
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

  function toggleDomain(id: string) {
    setDomainIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleManual(id: string) {
    setManualIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addRepoRule() {
    if (!newRepoId) return;
    const domainId = newRepoDomain === NO_DOMAIN ? null : newRepoDomain;
    setRepoRules((prev) =>
      prev.some((r) => r.repoId === newRepoId && r.domainId === domainId)
        ? prev
        : [...prev, { repoId: newRepoId, domainId }],
    );
    setNewRepoId("");
    setNewRepoDomain(NO_DOMAIN);
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

        {/* Domains */}
        <div className="space-y-2">
          <SectionLabel>Needed for domains</SectionLabel>
          {functionTypes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No domains defined for this project yet.
            </p>
          ) : (
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
                    onClick={() => toggleDomain(t.id)}
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
          )}
        </div>

        <Separator />

        {/* Repo rules */}
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
                  <span className="min-w-0 flex-1 truncate">
                    {repoName.get(r.repoId) ?? r.repoId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.domainId ? domainName.get(r.domainId) : "anyone"}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove rule"
                    onClick={() => setRepoRules((prev) => prev.filter((x) => x !== r))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {repos.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Link a repo to this project to use this.
            </p>
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

        <Separator />

        {/* Manual people */}
        <div className="space-y-2">
          <SectionLabel>Also assign specific people ({manualIds.size})</SectionLabel>
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
                  onClick={() => toggleManual(m.employeeId)}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function Row({ icon: Icon, children }: { icon: typeof UsersRoundIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </div>
  );
}
