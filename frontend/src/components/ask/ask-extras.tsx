"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, ClipboardCopyIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cn, notify } from "@/lib";
import type { AskProgress, AskRating, AskSteps, AskTable } from "@/schemas";
import { SectionCard } from "./ask-visuals";

const numStyle = { fontVariantNumeric: "tabular-nums" } as const;

async function copyText(text: string, label = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    notify.success(label);
  } catch {
    notify.error("Couldn't copy — select and copy manually");
  }
}

// ── Steps (interactive how-it-works walkthrough) ───────────────────────────────
export function AskStepsBlock({ data }: { data: AskSteps }) {
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  return (
    <SectionCard title={data.title}>
      {data.intro && <p className="-mt-1 mb-3 text-sm text-muted-foreground">{data.intro}</p>}
      <ol className="space-y-1">
        {data.steps.map((step, i) => {
          const isOpen = !!open[i];
          const expandable = !!(step.detail || step.code);
          const last = i === data.steps.length - 1;
          return (
            <li key={`${i}-${step.title}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  style={numStyle}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-honey-soft font-heading text-xs font-semibold text-brand-honey"
                >
                  {i + 1}
                </span>
                {!last && <span className="my-0.5 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <button
                  type="button"
                  disabled={!expandable}
                  onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
                  className={cn(
                    "flex w-full items-center gap-1.5 text-left text-sm font-medium text-foreground",
                    expandable && "hover:text-brand-honey",
                  )}
                >
                  <span className="min-w-0 flex-1">{step.title}</span>
                  {expandable && (
                    <ChevronRightIcon
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-90",
                      )}
                    />
                  )}
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-2">
                    {step.detail && <p className="text-sm text-muted-foreground">{step.detail}</p>}
                    {step.code && (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-2.5 py-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {step.language ?? "code"}
                          </span>
                          <button
                            type="button"
                            aria-label="Copy code"
                            onClick={() => copyText(step.code ?? "", "Code copied")}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <ClipboardCopyIcon className="size-3.5" />
                          </button>
                        </div>
                        <pre className="overflow-x-auto px-2.5 py-2 text-xs leading-relaxed">
                          <code className="font-mono text-foreground">{step.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

// ── Table (interactive: click a header to sort) ────────────────────────────────
export function AskTableBlock({ data }: { data: AskTable }) {
  const [sort, setSort] = useState<{ col: number; dir: "asc" | "desc" } | null>(null);

  const rows = useMemo(() => {
    if (!sort) return data.rows;
    const { col, dir } = sort;
    const numeric = data.columns[col]?.numeric;
    const factor = dir === "asc" ? 1 : -1;
    return [...data.rows].sort((a, b) => {
      const av = a[col] ?? "";
      const bv = b[col] ?? "";
      if (numeric) {
        return (Number.parseFloat(av) - Number.parseFloat(bv)) * factor;
      }
      return av.localeCompare(bv) * factor;
    });
  }, [data.rows, data.columns, sort]);

  function toggleSort(col: number) {
    setSort((s) => {
      if (s?.col !== col) return { col, dir: "asc" };
      return s.dir === "asc" ? { col, dir: "desc" } : null;
    });
  }

  const alignCls = { left: "text-left", center: "text-center", right: "text-right" } as const;

  return (
    <SectionCard title={data.title} className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {data.columns.map((c, ci) => {
                const active = sort?.col === ci;
                return (
                  <th
                    key={`${ci}-${c.header}`}
                    className={cn(
                      "px-3 py-2 font-semibold text-foreground first:pl-4 last:pr-4",
                      alignCls[c.align ?? (c.numeric ? "right" : "left")],
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(ci)}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-brand-teal",
                        c.numeric && "flex-row-reverse",
                        active && "text-brand-teal",
                      )}
                    >
                      <span>{c.header}</span>
                      {active &&
                        (sort?.dir === "asc" ? (
                          <ArrowUpIcon className="size-3" />
                        ) : (
                          <ArrowDownIcon className="size-3" />
                        ))}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                {data.columns.map((c, ci) => (
                  <td
                    key={`${ci}-${c.header}`}
                    style={c.numeric ? numStyle : undefined}
                    className={cn(
                      "px-3 py-2 first:pl-4 last:pr-4",
                      ci === 0 ? "font-medium text-foreground" : "text-muted-foreground",
                      alignCls[c.align ?? (c.numeric ? "right" : "left")],
                    )}
                  >
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.caption && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {data.caption}
        </p>
      )}
    </SectionCard>
  );
}

// ── Progress bars ──────────────────────────────────────────────────────────────
const PROGRESS_FILL: Record<NonNullable<AskProgress["items"][number]["intent"]>, string> = {
  neutral: "bg-brand-gradient",
  positive: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export function AskProgressBlock({ data }: { data: AskProgress }) {
  return (
    <SectionCard title={data.title}>
      <div className="space-y-3">
        {data.items.map((item, i) => {
          const pct = Math.max(0, Math.min(100, Math.round(item.value)));
          return (
            <div key={`${i}-${item.label}`}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span style={numStyle} className="text-xs font-medium text-muted-foreground">
                  {item.caption ?? `${pct}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out",
                    PROGRESS_FILL[item.intent ?? "neutral"],
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ── Rating (discrete pips) ─────────────────────────────────────────────────────
export function AskRatingBlock({ data }: { data: AskRating }) {
  return (
    <SectionCard title={data.title}>
      <div className="space-y-2.5">
        {data.items.map((item, i) => {
          const max = item.max ?? 5;
          const filled = Math.max(0, Math.min(max, Math.round(item.score)));
          return (
            <div key={`${i}-${item.label}`} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {item.label}
              </span>
              {item.caption && (
                <span className="shrink-0 text-xs text-muted-foreground">{item.caption}</span>
              )}
              <span className="flex shrink-0 gap-1" aria-label={`${filled} of ${max}`}>
                {Array.from({ length: max }, (_, p) => (
                  <span
                    key={p}
                    className={cn(
                      "size-2.5 rounded-full",
                      p < filled ? "bg-brand-honey" : "bg-muted",
                    )}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
