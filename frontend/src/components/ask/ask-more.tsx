"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardCopyIcon,
  EyeIcon,
  EyeOffIcon,
  GaugeIcon,
  LockIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn, notify } from "@/lib";
import type {
  AskAnnotatedCode,
  AskApiEndpoint,
  AskConfidenceCheck,
  AskDecisionTree,
  AskDiff,
  AskEnvVars,
  AskProsCons,
} from "@/schemas";
import { Badge, Button } from "@/ui";
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

function CopyButton({ text, label }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={() => copyText(text, label)}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      <ClipboardCopyIcon className="size-3.5" />
    </button>
  );
}

// ── API endpoint reference card ────────────────────────────────────────────────
const METHOD_TONE: Record<AskApiEndpoint["method"], string> = {
  GET: "border-brand-info/30 bg-brand-info-soft/60 text-brand-info",
  POST: "border-success/30 bg-success/10 text-success",
  PUT: "border-warning/30 bg-warning/10 text-warning",
  PATCH: "border-warning/30 bg-warning/10 text-warning",
  DELETE: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function AskApiEndpointBlock({ data }: { data: AskApiEndpoint }) {
  const examples = [
    data.requestExample
      ? { key: "request" as const, label: "Request", body: data.requestExample }
      : null,
    data.responseExample
      ? { key: "response" as const, label: "Response", body: data.responseExample }
      : null,
  ].filter(Boolean) as { key: "request" | "response"; label: string; body: string }[];
  const [tab, setTab] = useState<"request" | "response">(examples[0]?.key ?? "request");
  const active = examples.find((e) => e.key === tab) ?? examples[0];

  return (
    <SectionCard title={data.title} className="p-0">
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 font-mono text-xs font-bold tracking-wide",
              METHOD_TONE[data.method],
            )}
          >
            {data.method}
          </span>
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
            {data.path}
          </code>
          <CopyButton text={`${data.method} ${data.path}`} label="Endpoint copied" />
        </div>
        {data.auth && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-teal/25 bg-brand-teal-soft/40 px-2 py-0.5 text-xs font-medium text-brand-teal">
            <LockIcon className="size-3" />
            {data.auth}
          </div>
        )}
        {data.description && (
          <p className="mt-2 text-sm text-muted-foreground">{data.description}</p>
        )}
      </div>

      {data.params && data.params.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Parameters</div>
          <ul className="space-y-1.5">
            {data.params.map((p, i) => (
              <li key={`${i}-${p.name}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <code className="font-mono font-medium text-foreground">{p.name}</code>
                {p.type && <span className="font-mono text-xs text-brand-teal">{p.type}</span>}
                {p.required && (
                  <span className="text-xs font-medium text-destructive">required</span>
                )}
                {p.description && (
                  <span className="w-full text-xs text-muted-foreground sm:w-auto sm:flex-1">
                    {p.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {active && (
        <div className="border-t border-border">
          {examples.length > 1 && (
            <div className="flex gap-1 border-b border-border px-2 pt-2">
              {examples.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => setTab(e.key)}
                  className={cn(
                    "rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors",
                    tab === e.key
                      ? "border-b-2 border-brand-honey text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="absolute top-2 right-2">
              <CopyButton text={active.body} label={`${active.label} copied`} />
            </div>
            <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
              <code className="font-mono text-foreground">{active.body}</code>
            </pre>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Annotated code (click an annotation to highlight its lines) ─────────────────
export function AskAnnotatedCodeBlock({ data }: { data: AskAnnotatedCode }) {
  const [selected, setSelected] = useState<number | null>(null);
  const lines = useMemo(() => data.code.replace(/\n$/, "").split("\n"), [data.code]);

  const activeRange = selected !== null ? data.annotations[selected] : null;
  const inRange = (lineNo: number) => {
    if (!activeRange) return false;
    const start = activeRange.line;
    const end = activeRange.endLine ?? activeRange.line;
    return lineNo >= start && lineNo <= end;
  };
  // Line numbers that carry any annotation start — shown with a marker dot.
  const marked = useMemo(() => {
    const m = new Map<number, number>();
    data.annotations.forEach((a, i) => {
      if (!m.has(a.line)) m.set(a.line, i);
    });
    return m;
  }, [data.annotations]);

  return (
    <SectionCard title={data.title} className="p-0">
      {data.filePath && (
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-1.5">
          <span className="truncate font-mono text-xs text-muted-foreground">{data.filePath}</span>
          <CopyButton text={data.code} label="Code copied" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs leading-relaxed">
          <tbody>
            {lines.map((line, idx) => {
              const lineNo = idx + 1;
              const annIdx = marked.get(lineNo);
              const highlighted = inRange(lineNo);
              return (
                <tr
                  key={lineNo}
                  className={cn(
                    "transition-colors",
                    highlighted && "bg-brand-honey-soft/40",
                    annIdx !== undefined && "cursor-pointer",
                  )}
                  onClick={
                    annIdx !== undefined
                      ? () => setSelected((s) => (s === annIdx ? null : annIdx))
                      : undefined
                  }
                >
                  <td
                    style={numStyle}
                    className={cn(
                      "w-10 select-none border-r border-border px-2 py-0.5 text-right align-top text-muted-foreground/60",
                      highlighted && "text-brand-amber",
                    )}
                  >
                    {lineNo}
                  </td>
                  <td className="w-5 select-none py-0.5 text-center align-top">
                    {annIdx !== undefined && (
                      <span
                        style={numStyle}
                        className={cn(
                          "inline-flex size-4 items-center justify-center rounded-full text-xs font-bold",
                          selected === annIdx
                            ? "bg-brand-honey text-white"
                            : "bg-brand-honey-soft text-brand-honey",
                        )}
                      >
                        {annIdx + 1}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-pre py-0.5 pr-4 pl-2 align-top text-foreground">
                    {line || " "}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ol className="space-y-1.5 border-t border-border p-3">
        {data.annotations.map((a, i) => {
          const isSel = selected === i;
          return (
            <li key={`${i}-${a.line}`}>
              <button
                type="button"
                onClick={() => setSelected((s) => (s === i ? null : i))}
                className={cn(
                  "flex w-full gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  isSel ? "bg-brand-honey-soft/40" : "hover:bg-muted/50",
                )}
              >
                <span
                  style={numStyle}
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isSel ? "bg-brand-honey text-white" : "bg-brand-honey-soft text-brand-honey",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  {a.label && (
                    <span className="mr-1.5 text-sm font-semibold text-foreground">{a.label}</span>
                  )}
                  <span className="text-sm text-muted-foreground">{a.note}</span>
                </span>
                <span
                  style={numStyle}
                  className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground/70"
                >
                  L{a.line}
                  {a.endLine && a.endLine !== a.line ? `–${a.endLine}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

// ── Diff (before → after) ───────────────────────────────────────────────────────
const DIFF_TONE = {
  add: { row: "bg-success/5", gutter: "text-success", marker: "+", text: "text-foreground" },
  remove: {
    row: "bg-destructive/5",
    gutter: "text-destructive",
    marker: "-",
    text: "text-muted-foreground",
  },
  context: {
    row: "",
    gutter: "text-muted-foreground/50",
    marker: " ",
    text: "text-muted-foreground",
  },
} as const;

export function AskDiffBlock({ data }: { data: AskDiff }) {
  const added = data.lines.filter((l) => l.kind === "add").length;
  const removed = data.lines.filter((l) => l.kind === "remove").length;
  const afterText = data.lines
    .filter((l) => l.kind !== "remove")
    .map((l) => l.text)
    .join("\n");

  return (
    <SectionCard title={data.title} className="p-0">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          {data.filePath && (
            <span className="truncate font-mono text-xs text-muted-foreground">
              {data.filePath}
            </span>
          )}
          <span style={numStyle} className="shrink-0 font-mono text-xs">
            <span className="text-success">+{added}</span>{" "}
            <span className="text-destructive">−{removed}</span>
          </span>
        </div>
        <CopyButton text={afterText} label="Updated code copied" />
      </div>
      <div className="overflow-x-auto">
        <pre className="text-xs leading-relaxed">
          <code className="font-mono">
            {data.lines.map((l, i) => {
              const t = DIFF_TONE[l.kind];
              return (
                <span key={i} className={cn("flex", t.row)}>
                  <span className={cn("w-5 shrink-0 select-none px-1.5 text-center", t.gutter)}>
                    {t.marker}
                  </span>
                  <span className={cn("whitespace-pre pr-4", t.text)}>{l.text || " "}</span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
      {data.summary && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {data.summary}
        </p>
      )}
    </SectionCard>
  );
}

// ── Environment variables (reveal secrets, copy names) ─────────────────────────
function EnvVarRow({ v }: { v: AskEnvVars["vars"][number] }) {
  const [revealed, setRevealed] = useState(false);
  const masked = v.secret && !revealed;
  return (
    <li className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-foreground">
          {v.name}
        </code>
        {v.required ? (
          <Badge variant="destructive">required</Badge>
        ) : (
          <Badge variant="secondary">optional</Badge>
        )}
        <CopyButton text={v.name} label="Name copied" />
      </div>
      {v.description && <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>}
      {v.example && (
        <div className="mt-1.5 flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {masked ? "••••••••••••" : v.example}
          </code>
          {v.secret && (
            <button
              type="button"
              aria-label={revealed ? "Hide value" : "Reveal value"}
              onClick={() => setRevealed((r) => !r)}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              {revealed ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function AskEnvVarsBlock({ data }: { data: AskEnvVars }) {
  return (
    <SectionCard title={data.title ?? "Environment variables"}>
      {data.intro && <p className="-mt-1 mb-3 text-sm text-muted-foreground">{data.intro}</p>}
      <ul className="space-y-2">
        {data.vars.map((v, i) => (
          <EnvVarRow key={`${i}-${v.name}`} v={v} />
        ))}
      </ul>
    </SectionCard>
  );
}

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
