"use client";

import { Bell, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { useAssignmentOutcomes } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import {
  getSeenOutcomeKeys,
  markOutcomesSeen,
  outcomeSeenKey,
  seedSeenOutcomesIfEmpty,
} from "@/lib/outcome-seen";
import { cn } from "@/lib/utils";
import type { AssignmentOutcome } from "@/schemas/packAssignment.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton } from "@/ui/skeleton";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function OutcomeRow({
  outcome,
  isNew,
  onNavigate,
}: {
  outcome: AssignmentOutcome;
  isNew: boolean;
  onNavigate: () => void;
}) {
  const passed = outcome.status === "passed";
  const Icon = passed ? CheckCircle2 : XCircle;
  const when = relativeTime(outcome.updatedAt);

  return (
    <li>
      <Link
        href={`/doc-packs/${outcome.docPackId}`}
        onClick={onNavigate}
        className={cn(
          "flex gap-3 rounded-lg px-3 py-2.5 transition-[background-color,transform] duration-200",
          "hover:bg-muted active:scale-[0.99]",
          isNew && "bg-brand-honey-soft/50",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
            passed
              ? "bg-brand-moss-soft text-brand-moss"
              : "bg-brand-coral-soft text-brand-coral",
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {outcome.employeeName}
            </span>
            {isNew && (
              <Badge variant="warning" className="h-5 shrink-0 px-1.5 text-[0.65rem]">
                New
              </Badge>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">
            {passed ? "Passed" : "Failed"} · {outcome.docPackName}
            {when ? ` · ${when}` : ""}
          </span>
          <span className="mt-1.5 inline-flex">
            <Badge variant={assignmentStatusVariant(outcome.status)} className="h-5 text-[0.65rem]">
              {ASSIGNMENT_STATUS_LABEL[outcome.status]}
            </Badge>
          </span>
        </span>
      </Link>
    </li>
  );
}

function OutcomesBody({
  isLoading,
  isError,
  outcomes,
  newKeys,
  newCount,
  onClose,
}: {
  isLoading: boolean;
  isError: boolean;
  outcomes: AssignmentOutcome[];
  newKeys: Set<string>;
  newCount: number;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border/70 px-3.5 py-2.5">
        <div>
          <p className="text-sm font-semibold text-balance">Quiz results</p>
          <p className="text-xs text-muted-foreground">
            {outcomes.length === 0
              ? "No pass/fail results yet"
              : `${outcomes.length} recent · ${newCount} new`}
          </p>
        </div>
        <Link
          href="/doc-packs"
          onClick={onClose}
          className="text-xs font-medium text-brand-teal transition-colors hover:text-brand-teal/80"
        >
          Quiz packs
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2 p-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && isError && (
        <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">
          Could not load quiz results.
        </p>
      )}

      {!isLoading && !isError && outcomes.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-3.5 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-moss-soft text-brand-moss">
            <CheckCircle2 className="size-4" />
          </span>
          <p className="text-sm font-medium">No results yet</p>
          <p className="text-xs text-pretty text-muted-foreground">
            When a teammate passes or fails a quiz, it shows up here.
          </p>
        </div>
      )}

      {!isLoading && !isError && outcomes.length > 0 && (
        <ul className="max-h-80 space-y-0.5 overflow-y-auto p-1.5">
          {outcomes.map((outcome) => (
            <OutcomeRow
              key={outcomeSeenKey(outcome)}
              outcome={outcome}
              isNew={newKeys.has(outcomeSeenKey(outcome))}
              onNavigate={onClose}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Topbar inbox for org admins: polls recent quiz pass/fail outcomes and surfaces
 * newly graded attempts until the panel is opened.
 */
export function AdminOutcomeNotifications() {
  const { isAdmin, employeeId, isLoading: roleLoading } = useAppRole();
  const outcomesQuery = useAssignmentOutcomes({
    enabled: isAdmin,
    refetchInterval: isAdmin ? 45_000 : false,
  });
  const [open, setOpen] = useState(false);
  const [seenKeys, setSeenKeys] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  const outcomes = outcomesQuery.data ?? [];

  useEffect(() => {
    if (!employeeId || !isAdmin || !outcomesQuery.isSuccess) return;
    seedSeenOutcomesIfEmpty(employeeId, outcomes);
    setSeenKeys(getSeenOutcomeKeys(employeeId));
    setHydrated(true);
  }, [employeeId, isAdmin, outcomesQuery.isSuccess, outcomes]);

  const newKeys = useMemo(() => {
    if (!hydrated) return new Set<string>();
    return new Set(
      outcomes.map(outcomeSeenKey).filter((key) => !seenKeys.has(key)),
    );
  }, [outcomes, seenKeys, hydrated]);

  const newCount = newKeys.size;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && employeeId) {
      markOutcomesSeen(
        employeeId,
        outcomes.map(outcomeSeenKey),
      );
      setSeenKeys(getSeenOutcomeKeys(employeeId));
    }
  }

  if (roleLoading || !isAdmin) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            newCount > 0
              ? `${newCount} new quiz result${newCount === 1 ? "" : "s"}`
              : "Quiz results"
          }
        >
          <Bell className="size-4" />
          {newCount > 0 && (
            <span
              className={cn(
                "absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full",
                "bg-brand-coral px-1 text-[0.625rem] font-semibold leading-none text-white tabular-nums",
                "shadow-[0_0_0_2px_var(--background)]",
              )}
              aria-hidden
            >
              {newCount > 9 ? "9+" : newCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <OutcomesBody
          isLoading={outcomesQuery.isLoading}
          isError={outcomesQuery.isError}
          outcomes={outcomes}
          newKeys={newKeys}
          newCount={newCount}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
