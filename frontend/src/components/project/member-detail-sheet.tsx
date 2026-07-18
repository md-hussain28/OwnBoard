"use client";

import { CrownIcon, GitCommitHorizontalIcon, StarIcon, Trash2Icon } from "lucide-react";
import { EmptyState } from "@/components/shared";
import {
  useProjectSkills,
  useRemoveProjectMember,
  useUpdateProjectMember,
} from "@/hooks/queries/project";
import { notify } from "@/lib";
import type { ProjectFunctionType, ProjectMember } from "@/schemas";
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
} from "@/ui";
import { ReadinessBar } from "./readiness";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Full detail for one project member: identity, onboarding completion, skills (from commit
 * history — filled in by the code-intelligence pass), and management actions when manageable.
 */
export function MemberDetailSheet({
  projectId,
  member,
  manageable,
  functionTypes,
  open,
  onOpenChange,
}: {
  projectId: string;
  member: ProjectMember | null;
  manageable: boolean;
  functionTypes: ProjectFunctionType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateProjectMember(projectId);
  const remove = useRemoveProjectMember(projectId);
  const { data: skills } = useProjectSkills(projectId, open);
  const mine = member ? skills?.find((s) => s.employeeId === member.employeeId) : undefined;

  if (!member) return null;

  function setFunction(value: string) {
    if (!member) return;
    update.mutate(
      { employeeId: member.employeeId, input: { functionTypeId: value } },
      { onError: (err) => notify.apiError(err, "Could not set role") },
    );
  }

  function toggleLead() {
    if (!member) return;
    const wasLead = member.isLead;
    update.mutate(
      { employeeId: member.employeeId, input: { isLead: !wasLead } },
      {
        onSuccess: () =>
          notify.success(wasLead ? "Lead removed" : "Promoted to team lead", {
            description: member.name,
          }),
        onError: (err) => notify.apiError(err, "Could not update lead"),
      },
    );
  }

  function handleRemove() {
    if (!member) return;
    const name = member.name;
    remove.mutate(member.employeeId, {
      onSuccess: () => {
        onOpenChange(false);
        notify.success("Member removed", { description: name });
      },
      onError: (err) => notify.apiError(err, "Could not remove member"),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="gap-2 pr-10">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-mist text-sm font-semibold text-brand-ink">
              {initials(member.name)}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <SheetTitle className="truncate">{member.name}</SheetTitle>
                {member.functionTypeName && (
                  <Badge variant="secondary">{member.functionTypeName}</Badge>
                )}
                {member.isLead && (
                  <Badge variant="default">
                    <CrownIcon className="size-3" /> Lead
                  </Badge>
                )}
                {member.isGoTo && (
                  <Badge variant="success">
                    <StarIcon className="size-3" /> Go-to
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {member.role ?? member.domainName ?? "Member"}
                {member.githubHandle ? (
                  <>
                    {" · "}
                    <a
                      href={`https://github.com/${member.githubHandle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground"
                    >
                      @{member.githubHandle}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Onboarding completion
            </h3>
            <ReadinessBar readiness={member.readiness} />
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Skills &amp; features
              </h3>
              {mine?.matched && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <GitCommitHorizontalIcon className="size-3.5" /> {mine.totalCommits} commits
                </span>
              )}
            </div>
            {!mine?.matched ? (
              <EmptyState
                icon={GitCommitHorizontalIcon}
                tone="mist"
                compact
                bordered={false}
                title="No commit-derived skills yet"
                description={`They appear once a repo this person's GitHub handle${member.githubHandle ? "" : " (not set)"} has committed to is linked and ingested.`}
              />
            ) : (
              <div className="space-y-3">
                {mine.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {mine.skills.map((s) => (
                      <Badge key={s.name} variant="secondary">
                        {s.name}
                        <span className="ml-1 text-muted-foreground">{s.commitCount}</span>
                      </Badge>
                    ))}
                  </div>
                )}
                {mine.features.length > 0 && (
                  <ul className="space-y-1">
                    {mine.features.map((f) => (
                      <li
                        key={`${f.repoName ?? ""}:${f.filePath}`}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate font-mono text-muted-foreground">
                          {f.filePath}
                        </span>
                        <span className="shrink-0 text-muted-foreground">{f.commitCount}c</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>

        {manageable && (
          <SheetFooter className="gap-3 border-t bg-muted/30">
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Role</span>
              <Select value={member.functionTypeId ?? ""} onValueChange={setFunction}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {functionTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={toggleLead}
                disabled={update.isPending}
              >
                <CrownIcon className="size-4" />
                {member.isLead ? "Remove as lead" : "Make team lead"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleRemove}
                disabled={remove.isPending}
              >
                <Trash2Icon className="size-4" /> Remove
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
