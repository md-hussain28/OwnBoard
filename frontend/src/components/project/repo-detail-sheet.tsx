"use client";

import {
  BrainIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  GitBranchIcon,
  Layers2Icon,
  MessagesSquareIcon,
  PlugZapIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { RepoAttachedDocs, RepoConnectPanel, repoSlug } from "@/components/repo";
import { useRepo } from "@/hooks/queries/repo";
import { appPath, cn } from "@/lib";
import type { ProjectRepo } from "@/schemas";
import {
  Badge,
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@/ui";
import { RepoMembersDialog } from "./repo-members-dialog";

const EXPLORE = [
  { key: "dashboard", label: "Skill graph", icon: BrainIcon },
  { key: "experts", label: "Who to ask", icon: UsersIcon },
  { key: "chat", label: "Ask the codebase", icon: MessagesSquareIcon },
] as const;

/** A titled block inside the sheet — keeps every section visually consistent. */
function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3.5" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Right-hand detail sidebar for one linked repo. Since the panel no longer navigates to a
 * separate detail page, this is the single surface for a repo's facts: sync state, who's
 * assigned, its reference docs, and (for managers) the one-time sync setup. Everything shown
 * is real API data — per-repo tech stack isn't exposed yet, so we say so rather than fake it.
 */
export function RepoDetailSheet({
  projectId,
  repo,
  manageable,
  open,
  onOpenChange,
}: {
  projectId: string;
  repo: ProjectRepo | null;
  manageable: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {repo ? <RepoDetailBody projectId={projectId} repo={repo} manageable={manageable} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function RepoDetailBody({
  projectId,
  repo,
  manageable,
}: {
  projectId: string;
  repo: ProjectRepo;
  manageable: boolean;
}) {
  const { data: fullRepo, isLoading } = useRepo(repo.repoId);
  const synced = Boolean(fullRepo?.ingestedAt);
  const slug = repoSlug(repo.url) ?? repo.repoId;
  const title = repo.name ?? slug;

  return (
    <>
      <SheetHeader className="gap-2 border-b border-border">
        <div className="flex items-start gap-3 pr-8">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal-soft text-brand-teal">
            <GitBranchIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <SheetTitle className="flex items-center gap-2">
              <span className="truncate">{title}</span>
              {repo.isPrimary && (
                <Badge variant="outline" className="shrink-0 gap-1">
                  <StarIcon className="size-3" /> Primary
                </Badge>
              )}
            </SheetTitle>
            {repo.url ? (
              <SheetDescription asChild>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 truncate underline-offset-2 hover:underline"
                >
                  {slug}
                  <ExternalLinkIcon className="size-3 shrink-0" />
                </a>
              </SheetDescription>
            ) : (
              <SheetDescription>{slug}</SheetDescription>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-5 w-24 rounded-full" />
          ) : synced ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2Icon className="size-3" />
              Synced
              {fullRepo?.ingestedAt
                ? ` · ${new Date(fullRepo.ingestedAt).toLocaleDateString()}`
                : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <PlugZapIcon className="size-3" /> Not synced yet
            </Badge>
          )}
          <Badge variant="secondary">
            {repo.assignees.length} {repo.assignees.length === 1 ? "person" : "people"}
          </Badge>
        </div>
      </SheetHeader>

      <div className="space-y-6 p-4">
        {/* Assignees */}
        <Section
          icon={UsersIcon}
          title="Who works here"
          action={manageable ? <RepoMembersDialog projectId={projectId} repo={repo} /> : undefined}
        >
          {repo.assignees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one assigned yet.{" "}
              {manageable ? "Assign members so their skills stay accurate." : ""}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {repo.assignees.map((a) => (
                <Badge key={a.employeeId} variant="secondary">
                  {a.name}
                </Badge>
              ))}
            </div>
          )}
        </Section>

        {/* Tech stack — honestly not available per-repo yet */}
        <Section icon={Layers2Icon} title="Tech stack">
          <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            Per-repo tech stack isn't detected yet — it'll be inferred from commit history once this
            repo has been synced.
          </p>
        </Section>

        <Separator />

        {/* Sync setup — the heavy connect panel, kept here now that there's no detail page */}
        {manageable && !isLoading && fullRepo ? (
          <Section icon={PlugZapIcon} title="Sync setup">
            <RepoConnectPanel repo={fullRepo} />
          </Section>
        ) : null}

        {/* Reference docs attached to this repo */}
        <RepoAttachedDocs projectId={projectId} repoId={repo.repoId} />

        {/* Explore — global, repo-grounded surfaces */}
        <Section icon={BrainIcon} title="Explore">
          <div className="grid gap-2">
            {EXPLORE.map(({ key, label, icon: Icon }) => (
              <Button key={key} asChild variant="outline" className="justify-start">
                <Link href={appPath(key)}>
                  <Icon className={cn("size-4 text-brand-teal")} />
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
