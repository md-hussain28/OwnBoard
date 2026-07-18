"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClipboardCopyIcon,
  InfoIcon,
  LifeBuoyIcon,
  OctagonAlertIcon,
  UserRoundIcon,
} from "lucide-react";
import { useState } from "react";
import { cn, notify } from "@/lib";
import type {
  AskCallout,
  AskChecklist,
  AskComparison,
  AskExpert,
  AskMetrics,
  AskTimeline,
} from "@/schemas";
import { Badge, Button } from "@/ui";

const numStyle = { fontVariantNumeric: "tabular-nums" } as const;

export function SectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-soft", className)}>
      {title && (
        <div className="mb-3 font-heading text-sm font-semibold text-foreground">{title}</div>
      )}
      {children}
    </div>
  );
}

// ── Metrics ───────────────────────────────────────────────────────────────────
const METRIC_INTENT: Record<NonNullable<AskMetrics["metrics"][number]["intent"]>, string> = {
  neutral: "border-border bg-muted/40 text-foreground",
  positive: "border-success/25 bg-success/5 text-success",
  warning: "border-warning/25 bg-warning/5 text-warning",
  danger: "border-destructive/25 bg-destructive/5 text-destructive",
};

export function AskMetricsBlock({ data }: { data: AskMetrics }) {
  return (
    <SectionCard title={data.title}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {data.metrics.map((m) => {
          const intent = m.intent ?? "neutral";
          return (
            <div key={m.label} className={cn("rounded-lg border p-3", METRIC_INTENT[intent])}>
              <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
              <div style={numStyle} className="mt-0.5 font-heading text-xl font-bold leading-tight">
                {m.value}
              </div>
              {m.delta && <div className="mt-0.5 text-xs opacity-80">{m.delta}</div>}
              {m.hint && <div className="mt-1 text-xs text-muted-foreground">{m.hint}</div>}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ── Checklist (interactive: tick items off, live progress) ─────────────────────
export function AskChecklistBlock({ data }: { data: AskChecklist }) {
  const [done, setDone] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(data.items.map((item, i) => [i, !!item.done])),
  );
  const completed = Object.values(done).filter(Boolean).length;
  const total = data.items.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <SectionCard title={data.title}>
      {data.intro && <p className="-mt-1 mb-3 text-sm text-muted-foreground">{data.intro}</p>}

      <div className="mb-3 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-gradient transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span style={numStyle} className="text-xs font-medium text-muted-foreground">
          {completed}/{total}
        </span>
      </div>

      <ol className="space-y-1">
        {data.items.map((item, i) => {
          const isDone = !!done[i];
          return (
            <li key={`${i}-${item.title}`}>
              <button
                type="button"
                onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                className="flex w-full gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted/50"
              >
                {isDone ? (
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                )}
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium text-foreground",
                      isDone && "text-muted-foreground line-through",
                    )}
                  >
                    {item.title}
                  </div>
                  {item.detail && (
                    <div className="text-sm text-muted-foreground">{item.detail}</div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
export function AskTimelineBlock({ data }: { data: AskTimeline }) {
  return (
    <SectionCard title={data.title}>
      <ol className="relative ml-1 space-y-4 border-l border-border pl-5">
        {data.items.map((item, i) => (
          <li key={`${i}-${item.title}`} className="relative">
            <span className="absolute top-1 -left-[1.44rem] size-2.5 rounded-full border-2 border-card bg-brand-honey" />
            {item.timeframe && (
              <div style={numStyle} className="text-xs font-medium text-brand-teal">
                {item.timeframe}
              </div>
            )}
            <div className="text-sm font-medium text-foreground">{item.title}</div>
            {item.detail && <div className="text-sm text-muted-foreground">{item.detail}</div>}
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────────
export function AskComparisonBlock({ data }: { data: AskComparison }) {
  return (
    <SectionCard title={data.title}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {data.columns.map((c, i) => (
                <th
                  key={c}
                  className={cn(
                    "px-2.5 py-2 text-left font-semibold text-foreground",
                    i === 0 && "sticky left-0 bg-card",
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr key={`${ri}-${row.label}`} className="border-b border-border/60 last:border-0">
                <td className="sticky left-0 bg-card px-2.5 py-2 font-medium text-foreground">
                  {row.label}
                </td>
                {row.cells.map((cell, ci) => (
                  <td key={`${ci}-${cell}`} className="px-2.5 py-2 text-muted-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ── Expert / who to ask ───────────────────────────────────────────────────────
const BUS_FACTOR: Record<
  NonNullable<AskExpert["busFactorRisk"]>,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  low: { label: "Low bus-factor risk", variant: "success" },
  medium: { label: "Medium bus-factor risk", variant: "warning" },
  high: { label: "High bus-factor risk", variant: "destructive" },
};

export function AskExpertBlock({ data }: { data: AskExpert }) {
  const initials = data.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  async function copyDraft() {
    if (!data.draftMessage) return;
    try {
      await navigator.clipboard.writeText(data.draftMessage);
      notify.success("Draft copied to clipboard");
    } catch {
      notify.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-teal-soft font-heading text-sm font-semibold text-brand-teal">
          {initials || <UserRoundIcon className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-sm font-semibold text-foreground">{data.name}</span>
            {data.role && <span className="text-xs text-muted-foreground">{data.role}</span>}
            {data.busFactorRisk && (
              <Badge variant={BUS_FACTOR[data.busFactorRisk].variant}>
                {BUS_FACTOR[data.busFactorRisk].label}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{data.reason}</p>

          {data.evidence && data.evidence.length > 0 && (
            <ul className="mt-2 space-y-1">
              {data.evidence.map((e, i) => (
                <li key={`${i}-${e}`} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-teal" />
                  {e}
                </li>
              ))}
            </ul>
          )}

          {data.draftMessage && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{data.draftMessage}</p>
              <Button size="xs" variant="outline" className="mt-2" onClick={copyDraft}>
                <ClipboardCopyIcon />
                Copy draft
              </Button>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// ── Callout ───────────────────────────────────────────────────────────────────
const CALLOUT: Record<
  AskCallout["intent"],
  { icon: typeof InfoIcon; wrap: string; icon_c: string }
> = {
  info: {
    icon: InfoIcon,
    wrap: "border-brand-info/25 bg-brand-info-soft/50",
    icon_c: "text-brand-info",
  },
  success: {
    icon: CheckCircle2Icon,
    wrap: "border-success/25 bg-success/5",
    icon_c: "text-success",
  },
  warning: {
    icon: AlertTriangleIcon,
    wrap: "border-warning/25 bg-warning/5",
    icon_c: "text-warning",
  },
  danger: {
    icon: OctagonAlertIcon,
    wrap: "border-destructive/25 bg-destructive/5",
    icon_c: "text-destructive",
  },
  escalate: {
    icon: LifeBuoyIcon,
    wrap: "border-brand-teal/25 bg-brand-teal-soft/50",
    icon_c: "text-brand-teal",
  },
};

export function AskCalloutBlock({ data }: { data: AskCallout }) {
  const c = CALLOUT[data.intent];
  const Icon = c.icon;
  return (
    <div className={cn("flex gap-3 rounded-xl border p-3.5", c.wrap)}>
      <Icon className={cn("mt-0.5 size-4.5 shrink-0", c.icon_c)} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{data.title}</div>
        <p className="mt-0.5 text-sm text-muted-foreground">{data.body}</p>
      </div>
    </div>
  );
}
