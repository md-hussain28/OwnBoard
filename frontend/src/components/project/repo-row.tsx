"use client";

import {
  CheckCircle2Icon,
  GitBranchIcon,
  MoreVerticalIcon,
  PanelRightOpenIcon,
  PlugZapIcon,
  StarIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { repoSlug } from "@/components/repo";
import { ConfirmDialog } from "@/components/shared";
import { useRemoveProjectRepo } from "@/hooks/queries/project";
import { cn, isDraftId, notify } from "@/lib";
import type { ProjectRepo } from "@/schemas";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui";
import { RepoMembersDialog } from "./repo-members-dialog";

/** One repo as a scannable, clickable table row: identity · assignees · sync state + a `⋯` menu. */
export function RepoRow({
  projectId,
  repo,
  synced,
  manageable,
  onOpen,
}: {
  projectId: string;
  repo: ProjectRepo;
  synced: boolean;
  manageable: boolean;
  onOpen: () => void;
}) {
  const removeRepo = useRemoveProjectRepo(projectId);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // A repo linked by URL carries a client `new_…` repoId until the server responds — the
  // detail sheet, member editor, and remove all resolve by repoId, so keep the row inert.
  const isDraft = isDraftId(repo.repoId);
  const label = repo.name ?? repoSlug(repo.url) ?? repo.repoId;

  function handleRemove() {
    removeRepo.mutate(repo.repoId, {
      onSuccess: () => {
        setConfirmOpen(false);
        notify.success("Repo removed", { description: label });
      },
      onError: (err) => notify.apiError(err, "Could not remove repo"),
    });
  }

  return (
    <div
      role={isDraft ? undefined : "button"}
      tabIndex={isDraft ? undefined : 0}
      aria-busy={isDraft || undefined}
      onClick={isDraft ? undefined : onOpen}
      onKeyDown={
        isDraft
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
      }
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 transition-colors last:border-0",
        isDraft
          ? "animate-pulse opacity-70"
          : "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
      )}
    >
      {/* Identity */}
      <div className="flex min-w-0 flex-[2] items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal-soft text-brand-teal">
          <GitBranchIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <span className="truncate">{label}</span>
            {repo.isPrimary && (
              <Badge variant="outline" className="shrink-0 gap-1">
                <StarIcon className="size-3" /> Primary
              </Badge>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {repoSlug(repo.url) ?? repo.repoId}
          </p>
        </div>
      </div>

      {/* Assignees */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {repo.assignees.length === 0 ? (
          <span className="text-xs text-muted-foreground">No one assigned</span>
        ) : (
          repo.assignees.map((a) => (
            <Badge key={a.employeeId} variant="secondary">
              {a.name}
            </Badge>
          ))
        )}
      </div>

      {/* Sync state + actions */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {synced ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2Icon className="size-3" /> Synced
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <PlugZapIcon className="size-3" /> Not synced
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${label}`}
              disabled={isDraft}
              title={isDraft ? "Creating…" : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onOpen()}>
              <PanelRightOpenIcon /> View details
            </DropdownMenuItem>
            {manageable && (
              <DropdownMenuItem onSelect={() => setPeopleOpen(true)}>
                <UsersIcon /> Manage people
              </DropdownMenuItem>
            )}
            {manageable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    // Keep the confirm modal from racing the menu's close/focus handoff.
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                >
                  <Trash2Icon /> Remove from project
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Manager-only affordances, driven by the menu (rendered here so row clicks don't reach them) */}
      {manageable && (
        <div onClick={(e) => e.stopPropagation()}>
          <RepoMembersDialog
            projectId={projectId}
            repo={repo}
            open={peopleOpen}
            onOpenChange={setPeopleOpen}
          />
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Remove this repository?"
            description={
              <>
                <span className="font-medium text-foreground">{label}</span> will be unlinked from
                this project. Its imported commit history and any skills already derived from it are
                kept — you can link it again later.
              </>
            }
            confirmLabel="Remove repo"
            pending={removeRepo.isPending}
            onConfirm={handleRemove}
          />
        </div>
      )}
    </div>
  );
}
