"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  GaugeIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib";
import type { AskConfidenceCheck, AskDecisionTree, AskProsCons } from "@/schemas";
import { Button } from "@/ui";
import { SectionCard } from "./ask-visuals";

const numStyle = { fontVariantNumeric: "tabular-nums" } as const;

// ── Decision tree (interactive "choose your path") ─────────────────────────────
export function AskDecisionTreeBlock({ data }: { data: AskDecisionTree }) {
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const [path, setPath] = useState<{ nodeId: string; choice?: string }[]>([
    { nodeId: data.rootId },
  ]);
  const current = byId.get(path[path.length - 1]?.nodeId ?? data.rootId);
  const isTerminal = !current?.options || current.options.length === 0;

  function choose(label: string, next: string) {
    setPath((p) => {
      const copy = [...p];
      copy[copy.length - 1] = { ...copy[copy.length - 1], choice: label };
      copy.push({ nodeId: next });
      return copy;
    });
  }

  return (
    <SectionCard title={data.title ?? "Guided decision"}>
      {/* Trail of answered questions */}
      {path.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {path.slice(0, -1).map((step, i) => (
            <span
              key={`${i}-${step.nodeId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal-soft/50 px-2.5 py-0.5 text-xs font-medium text-brand-teal"
            >
              {step.choice}
              {i < path.length - 2 && <ArrowRightIcon className="size-3 opacity-60" />}
            </span>
          ))}
        </div>
      )}

      {current && (
        <div>
          {!isTerminal && current.question && (
            <p className="text-sm font-medium text-foreground">{current.question}</p>
          )}
          {!isTerminal && current.options && (
            <div className="mt-2.5 flex flex-col gap-2">
              {current.options.map((o, i) => (
                <button
                  key={`${i}-${o.label}`}
                  type="button"
                  onClick={() => choose(o.label, o.next)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:border-brand-honey/40 hover:bg-brand-honey-soft/30"
                >
                  <ArrowRightIcon className="size-4 shrink-0 text-brand-honey" />
                  <span className="min-w-0 flex-1">{o.label}</span>
                </button>
              ))}
            </div>
          )}
          {isTerminal && (
            <div className="rounded-xl border border-brand-moss/25 bg-brand-moss-soft/40 p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-moss">
                <CheckIcon className="size-4" />
                Recommendation
              </div>
              {current.result && (
                <p className="mt-1 text-sm font-medium text-foreground">{current.result}</p>
              )}
              {current.detail && (
                <p className="mt-1 text-sm text-muted-foreground">{current.detail}</p>
              )}
            </div>
          )}
        </div>
      )}

      {path.length > 1 && (
        <Button
          size="xs"
          variant="ghost"
          className="mt-3"
          onClick={() => setPath([{ nodeId: data.rootId }])}
        >
          <RotateCcwIcon />
          Start over
        </Button>
      )}
    </SectionCard>
  );
}

// ── Confidence check (self-assessment / readiness) ─────────────────────────────
export function AskConfidenceCheckBlock({ data }: { data: AskConfidenceCheck }) {
  const [scores, setScores] = useState<Record<number, number>>({});
  const rated = Object.keys(scores).length;
  const total = data.topics.length;
  const sum = Object.values(scores).reduce((a, b) => a + b, 0);
  const readiness = rated ? Math.round((sum / (total * 5)) * 100) : 0;
  const allRated = rated === total;

  // Lowest-scored topic to nudge focus once everything's rated.
  const focus = useMemo(() => {
    if (!allRated) return null;
    let min = Infinity;
    let label = "";
    data.topics.forEach((t, i) => {
      if (scores[i] < min) {
        min = scores[i];
        label = t.label;
      }
    });
    return { label, score: min };
  }, [allRated, scores, data.topics]);

  return (
    <SectionCard title={data.title ?? "Rate your readiness"}>
      {data.intro && <p className="-mt-1 mb-3 text-sm text-muted-foreground">{data.intro}</p>}
      <div className="space-y-2.5">
        {data.topics.map((t, i) => (
          <div key={`${i}-${t.label}`} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{t.label}</div>
              {t.hint && <div className="text-xs text-muted-foreground">{t.hint}</div>}
            </div>
            <div className="flex shrink-0 gap-1" role="radiogroup" aria-label={t.label}>
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (scores[i] ?? 0) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={scores[i] === n}
                    aria-label={`${n} of 5`}
                    onClick={() => setScores((s) => ({ ...s, [i]: n }))}
                    className={cn(
                      "size-6 rounded-md border text-xs font-semibold transition-colors",
                      filled
                        ? "border-brand-honey bg-brand-honey text-white"
                        : "border-border bg-card text-muted-foreground hover:border-brand-honey/40",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <GaugeIcon className="size-4 text-brand-teal" />
            Readiness
          </span>
          <span style={numStyle} className="text-sm font-semibold text-foreground">
            {allRated ? `${readiness}%` : `${rated}/${total} rated`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-out"
            style={{ width: `${allRated ? readiness : (rated / total) * 100}%` }}
          />
        </div>
        {focus && (
          <p className="mt-2 text-xs text-muted-foreground">
            {readiness >= 80 ? <>You're in good shape — keep sharpening </> : <>Start with </>}
            <span className="font-medium text-brand-teal">{focus.label}</span> (your lowest area).
          </p>
        )}
      </div>
    </SectionCard>
  );
}

// ── Pros & cons (decision aid) ─────────────────────────────────────────────────
export function AskProsConsBlock({ data }: { data: AskProsCons }) {
  return (
    <SectionCard title={data.title}>
      <div
        className={cn(
          "grid gap-3",
          data.options.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1",
        )}
      >
        {data.options.map((opt, i) => (
          <div key={`${i}-${opt.label}`} className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 font-heading text-sm font-semibold text-foreground">
              {opt.label}
            </div>
            <ul className="space-y-1">
              {opt.pros.map((p, pi) => (
                <li key={`pro-${pi}`} className="flex gap-1.5 text-sm text-foreground">
                  <PlusIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
                  <span className="min-w-0">{p}</span>
                </li>
              ))}
              {opt.cons.map((c, ci) => (
                <li key={`con-${ci}`} className="flex gap-1.5 text-sm text-muted-foreground">
                  <MinusIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  <span className="min-w-0">{c}</span>
                </li>
              ))}
            </ul>
            {opt.verdict && (
              <p className="mt-2 border-t border-border pt-2 text-xs font-medium text-brand-teal">
                {opt.verdict}
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
