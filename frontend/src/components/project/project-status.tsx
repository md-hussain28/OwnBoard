import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";

type BadgeVariant = "default" | "secondary" | "destructive" | "success" | "warning" | "outline";

type StatusMeta = {
  value: string;
  label: string;
  variant: BadgeVariant;
  /** Tailwind bg-* for the leading status dot. One hue per meaning (DESIGN.md §one-state-one-meaning). */
  dot: string;
  /** Short line shown on the overview to explain the stage. */
  hint: string;
};

/** The lifecycle stages a project moves through. Order = the natural progression, used for the selects. */
export const PROJECT_STATUSES: StatusMeta[] = [
  {
    value: "not_started",
    label: "Not started",
    variant: "secondary",
    dot: "bg-muted-foreground/50",
    hint: "Set up, but onboarding hasn't begun.",
  },
  {
    value: "active",
    label: "Active",
    variant: "default",
    dot: "bg-primary",
    hint: "Work is underway.",
  },
  {
    value: "paused",
    label: "Paused",
    variant: "warning",
    dot: "bg-warning",
    hint: "Temporarily on hold.",
  },
  {
    value: "completed",
    label: "Completed",
    variant: "success",
    dot: "bg-success",
    hint: "Delivered and wrapped up.",
  },
  {
    value: "abandoned",
    label: "Abandoned",
    variant: "destructive",
    dot: "bg-destructive",
    hint: "Dropped before completion.",
  },
];

const FALLBACK: StatusMeta = {
  value: "unknown",
  label: "Unknown",
  variant: "outline",
  dot: "bg-muted-foreground/40",
  hint: "",
};

export function projectStatusMeta(status: string): StatusMeta {
  return PROJECT_STATUSES.find((s) => s.value === status) ?? { ...FALLBACK, label: status };
}

/** Canonical status pill — the same shape everywhere a project's stage appears. */
export function ProjectStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = projectStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </Badge>
  );
}
