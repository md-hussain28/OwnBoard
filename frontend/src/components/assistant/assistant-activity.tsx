"use client";

import {
  BarChart3Icon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  FolderKanbanIcon,
  Loader2Icon,
  type LucideIcon,
  RouteIcon,
  TriangleAlertIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersRoundIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib";
import type { AssistantAction } from "@/schemas";

/** Per-action icon so each step previews what the agent is doing, not a generic dot. */
const ACTION_ICON: Record<string, LucideIcon> = {
  listProjects: FolderKanbanIcon,
  listEmployees: UsersRoundIcon,
  listTracks: RouteIcon,
  getOnboardingStats: BarChart3Icon,
  getProjectOnboardingStats: BarChart3Icon,
  getProjectMembers: UsersRoundIcon,
  listRecentOutcomes: ClipboardListIcon,
  addProjectMember: UserPlusIcon,
  removeProjectMember: UserMinusIcon,
  createEmployee: UserPlusIcon,
  assignOnboarding: ClipboardCheckIcon,
};

function titleFor(a: AssistantAction): string {
  return a.title || a.name;
}

/** One row of the agent timeline: a status node on a connector rail + the step's label and result. */
function Step({ action, last }: { action: AssistantAction; last: boolean }) {
  const running = action.phase !== "done";
  const failed = action.phase === "done" && action.ok === false;
  const write = action.kind === "write";
  const Icon = ACTION_ICON[action.name] ?? ZapIcon;

  // The node reflects state; a completed WRITE glows moss (a real change), reads settle to teal.
  const node = running
    ? "border-brand-teal/40 bg-brand-teal-soft text-brand-teal"
    : failed
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : write
        ? "border-success/30 bg-success/10 text-success"
        : "border-brand-teal/30 bg-brand-teal-soft text-brand-teal";

  return (
    <li className="ask-phase-in relative flex gap-3 pb-3 last:pb-0">
      {/* Connector rail — drawn behind the node, stops at the last step. */}
      {!last && (
        <span aria-hidden className="absolute left-[0.6875rem] top-6 bottom-0 w-px bg-border" />
      )}
      <span
        className={cn(
          "relative z-[1] flex size-[1.375rem] shrink-0 items-center justify-center rounded-full border",
          node,
        )}
      >
        {running && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-brand-teal/40 motion-safe:animate-ping"
          />
        )}
        {running ? (
          <Loader2Icon className="size-3 motion-safe:animate-spin" />
        ) : failed ? (
          <TriangleAlertIcon className="size-3" />
        ) : (
          <CheckIcon className="size-3" strokeWidth={3} />
        )}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            {titleFor(action)}
            {running && <span className="text-muted-foreground">…</span>}
          </span>
          {action.phase === "done" && write && !failed && (
            <span className="rounded-full bg-success/10 px-1.5 py-px text-[0.625rem] font-semibold text-success">
              Change
            </span>
          )}
        </div>
        {action.phase === "done" && action.summary && (
          <p
            className={cn(
              "mt-0.5 text-xs leading-relaxed",
              failed ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {action.summary}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The admin assistant's agent activity: a live timeline of the real tool steps it ran (look up
 * people, read stats, add a member, assign a track) with per-step running → done/failed state. This
 * is what makes the surface read as an agent doing work rather than a chat — the steps stream in as
 * they happen, then settle into a verifiable log of what changed. Collapsible once the work is done.
 */
export function AssistantActivity({ actions }: { actions: AssistantAction[] }) {
  const busy = actions.some((a) => a.phase !== "done");
  const failed = actions.some((a) => a.phase === "done" && a.ok === false);
  const writes = actions.filter((a) => a.kind === "write" && a.phase === "done" && a.ok !== false);
  // Open while working (so steps stream in view); once settled, start collapsed to keep the answer
  // front-and-centre — the admin can expand to audit exactly what ran.
  const [open, setOpen] = useState(true);
  const expanded = busy || open;

  const headline = busy
    ? "Working…"
    : failed
      ? "Ran into a problem"
      : writes.length > 0
        ? `Done — ${writes.length} ${writes.length === 1 ? "change" : "changes"} made`
        : "Done";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30 shadow-soft">
      <button
        type="button"
        onClick={() => !busy && setOpen((v) => !v)}
        aria-expanded={expanded}
        disabled={busy}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
          !busy && "hover:bg-muted/50",
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            busy
              ? "bg-brand-teal-soft text-brand-teal"
              : failed
                ? "bg-destructive/10 text-destructive"
                : "bg-success/10 text-success",
          )}
        >
          {busy ? (
            <Loader2Icon className="size-3.5 motion-safe:animate-spin" />
          ) : failed ? (
            <TriangleAlertIcon className="size-3.5" />
          ) : (
            <CheckIcon className="size-3.5" strokeWidth={3} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-semibold text-foreground">{headline}</span>
          <span className="truncate text-[0.6875rem] text-muted-foreground">
            {actions.length} {actions.length === 1 ? "step" : "steps"}
            {busy ? " · agent is running" : " · tap to review"}
          </span>
        </span>
        {!busy && (
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        )}
      </button>

      {expanded && (
        <ol className="border-t border-border/60 px-3 py-3">
          {actions.map((a, i) => (
            <Step key={`${a.name}-${i}`} action={a} last={i === actions.length - 1} />
          ))}
        </ol>
      )}
    </div>
  );
}
