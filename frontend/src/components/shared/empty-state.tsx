import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib";
import { Card, CardContent } from "@/ui";

type EmptyTone = "honey" | "teal" | "mist" | "moss" | "coral" | "info";

// Soft-fill well + saturated text per DESIGN.md — one job per hue. `mist` is the neutral
// fallback for "nothing to see, nothing wrong" (member-facing waits); `honey` invites the
// primary action; `coral` is reserved for genuinely empty-because-blocked states.
const toneWell: Record<EmptyTone, string> = {
  honey: "bg-brand-honey-soft text-brand-honey",
  teal: "bg-brand-teal-soft text-brand-teal",
  mist: "bg-brand-mist text-brand-ink",
  moss: "bg-brand-moss-soft text-brand-moss",
  coral: "bg-brand-coral-soft text-brand-coral",
  info: "bg-brand-info-soft text-brand-info",
};

type EmptyStateProps = {
  /** Lucide icon component (not an element) rendered in a soft-tinted well. */
  icon?: LucideIcon;
  tone?: EmptyTone;
  title: string;
  description?: ReactNode;
  /** Primary action(s) — a button, dialog trigger, or link. */
  action?: ReactNode;
  /** Wrap in a Card surface (default). Set false to drop into an existing card/well. */
  bordered?: boolean;
  /** Tighter padding for empty states nested inside a panel or tab. */
  compact?: boolean;
  className?: string;
};

/**
 * The one empty-state layout for every data-driven list in the console, so "no data yet"
 * always reads the same: a soft icon well, a short title, a one-line hint, and (when the
 * user can act) the action inline. Purely presentational — pass `isEmpty`/`empty` from
 * `QueryState` straight into this. For "no results match your filters" use `FilteredEmpty`.
 */
export function EmptyState({
  icon: Icon,
  tone = "mist",
  title,
  description,
  action,
  bordered = true,
  compact = false,
  className,
}: EmptyStateProps) {
  const body = (
    <div
      className={cn(
        "flex animate-in fade-in-50 slide-in-from-bottom-1 flex-col items-center text-center duration-300",
        compact ? "gap-2.5 py-8" : "gap-3 py-12",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-2xl",
            compact ? "size-11 [&_svg]:size-5" : "size-14 [&_svg]:size-6",
            toneWell[tone],
          )}
        >
          <Icon />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="font-heading font-semibold text-foreground text-balance">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );

  if (!bordered) return body;

  return (
    <Card>
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  );
}

type FilteredEmptyProps = {
  /** What the user searched/filtered for, e.g. "projects". */
  noun?: string;
  onClear?: () => void;
  clearLabel?: string;
  bordered?: boolean;
  className?: string;
};

/**
 * The "your search/filters matched nothing" counterpart to `EmptyState` — distinct copy and
 * a Clear button so the user knows the data exists, they've just filtered it away. Kept
 * separate so a filtered miss never renders the onboarding-style "create your first…" CTA.
 */
export function FilteredEmpty({
  noun = "results",
  onClear,
  clearLabel = "Clear filters",
  bordered = true,
  className,
}: FilteredEmptyProps) {
  const body = (
    <div className={cn("flex flex-col items-center gap-2 py-10 text-center", className)}>
      <p className="text-sm text-muted-foreground">No {noun} match your search or filters.</p>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-brand-honey underline-offset-4 hover:underline"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );

  if (!bordered) return body;

  return (
    <Card>
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  );
}
