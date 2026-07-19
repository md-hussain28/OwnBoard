"use client";

import {
  CalendarClockIcon,
  ClockIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  PencilIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectMembers, useSetTrackAssignment } from "@/hooks/queries/project";
import { appPath, notify } from "@/lib";
import type { ProjectFunctionType, ProjectRepo, ProjectTrack } from "@/schemas";
import { Badge, Button, Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/ui";
import { SectionLabel, TargetingEditor } from "./module-targeting-editor";

function statusVariant(status: string): "success" | "secondary" | "warning" {
  if (status === "active") return "success";
  if (status === "needs_review") return "warning";
  return "secondary";
}

function statusLabel(status: string): string {
  return status === "active" ? "Published" : status.replace("_", " ");
}

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

function Row({ icon: Icon, children }: { icon: typeof UsersRoundIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </div>
  );
}
