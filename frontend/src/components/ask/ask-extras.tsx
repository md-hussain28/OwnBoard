"use client";

import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  ClipboardCopyIcon,
  LightbulbIcon,
  QuoteIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn, notify } from "@/lib";
import type {
  AskAccordion,
  AskActions,
  AskBadges,
  AskFlow,
  AskFlowNodeKind,
  AskGlossary,
  AskKeyTakeaways,
  AskProgress,
  AskQuote,
  AskRating,
  AskSteps,
  AskTable,
  AskTree,
} from "@/schemas";
import { Badge, Button, Input } from "@/ui";
import { useAskDoc } from "./ask-doc-viewer";
import { useAskFollowup } from "./ask-followup";
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

// ── Glossary (interactive: filter/search terms) ────────────────────────────────
export function AskGlossaryBlock({ data }: { data: AskGlossary }) {
  const [q, setQ] = useState("");
  const showFilter = data.terms.length > 6;
  const query = q.trim().toLowerCase();
  const terms = query
    ? data.terms.filter((t) =>
        `${t.term} ${t.definition} ${t.aka ?? ""}`.toLowerCase().includes(query),
      )
    : data.terms;

  return (
    <SectionCard title={data.title ?? "Glossary"}>
      {showFilter && (
        <div className="relative mb-3">
          <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter terms…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      )}
      {terms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No terms match "{q}".</p>
      ) : (
        <dl className="divide-y divide-border/60">
          {terms.map((t, i) => (
            <div key={`${i}-${t.term}`} className="py-2 first:pt-0 last:pb-0">
              <dt className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{t.term}</span>
                {t.aka && <span className="text-xs text-muted-foreground">{t.aka}</span>}
              </dt>
              <dd className="mt-0.5 text-sm text-muted-foreground">{t.definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </SectionCard>
  );
}

// ── Badges (compact pill cluster) ──────────────────────────────────────────────
const BADGE_TONE: Record<NonNullable<AskBadges["badges"][number]["tone"]>, string> = {
  neutral: "border-border bg-muted/50 text-foreground",
  accent: "border-brand-teal/25 bg-brand-teal-soft/60 text-brand-teal",
  info: "border-brand-info/25 bg-brand-info-soft/60 text-brand-info",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
};

export function AskBadgesBlock({ data }: { data: AskBadges }) {
  return (
    <SectionCard title={data.title}>
      <div className="flex flex-wrap gap-1.5">
        {data.badges.map((b, i) => (
          <span
            key={`${i}-${b.label}`}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              BADGE_TONE[b.tone ?? "neutral"],
            )}
          >
            {b.label}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Accordion (generic collapsible sections) ───────────────────────────────────
export function AskAccordionBlock({ data }: { data: AskAccordion }) {
  return (
    <SectionCard title={data.title}>
      <div className="space-y-1.5">
        {data.sections.map((s, i) => (
          <details
            key={`${i}-${s.heading}`}
            open={s.defaultOpen}
            className="group/acc rounded-lg border border-border"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:text-brand-teal">
              <span className="min-w-0 flex-1">{s.heading}</span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/acc:rotate-90" />
            </summary>
            <p className="whitespace-pre-wrap border-t border-border px-3 py-2.5 text-sm text-muted-foreground">
              {s.body}
            </p>
          </details>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Quote (attributed pull-quote, optionally openable) ─────────────────────────
export function AskQuoteBlock({ data }: { data: AskQuote }) {
  const { open } = useAskDoc();
  const openable = !!data.documentId;

  const body = (
    <>
      <QuoteIcon className="size-5 shrink-0 text-brand-teal/50" />
      <div className="min-w-0 flex-1">
        <p className="text-sm italic leading-relaxed text-foreground">"{data.quote}"</p>
        {(data.author || data.role) && (
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {data.author}
            {data.author && data.role && " · "}
            {data.role && <span className="font-normal">{data.role}</span>}
          </p>
        )}
      </div>
      {openable && <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground" />}
    </>
  );

  const cls =
    "flex w-full gap-3 rounded-xl border border-brand-teal/20 bg-brand-teal-soft/25 p-4 text-left";

  if (openable) {
    return (
      <button
        type="button"
        onClick={() =>
          open({
            title: data.author ? `${data.author} — quote` : "Quoted source",
            source: "doc",
            documentId: data.documentId,
            snippet: data.quote,
          })
        }
        className={cn(cls, "transition-colors hover:bg-brand-teal-soft/40")}
      >
        {body}
      </button>
    );
  }
  return <blockquote className={cls}>{body}</blockquote>;
}

// ── Actions (interactive follow-up questions) ──────────────────────────────────
export function AskActionsBlock({ data }: { data: AskActions }) {
  const { ask, busy } = useAskFollowup();
  return (
    <SectionCard title={data.title ?? "Explore next"}>
      <div className="flex flex-wrap gap-2">
        {data.actions.map((a, i) => (
          <button
            key={`${i}-${a.label}`}
            type="button"
            disabled={busy}
            onClick={() => ask(a.prompt)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-honey/40 hover:bg-brand-honey-soft/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SparklesIcon className="size-3.5 shrink-0 text-brand-honey" />
            {a.label}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Key takeaways (TL;DR highlight list) ───────────────────────────────────────
export function AskKeyTakeawaysBlock({ data }: { data: AskKeyTakeaways }) {
  return (
    <div className="rounded-xl border border-brand-honey/20 bg-brand-honey-soft/25 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-amber">
        <LightbulbIcon className="size-4" />
        {data.title ?? "Key takeaways"}
      </div>
      <ul className="space-y-1.5">
        {data.points.map((p, i) => (
          <li key={`${i}-${p}`} className="flex gap-2 text-sm text-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-honey" />
            <span className="min-w-0">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Tree (interactive: expand / collapse a hierarchy) ──────────────────────────
type BuiltTreeNode = AskTree["nodes"][number] & { children: BuiltTreeNode[] };

function buildForest(nodes: AskTree["nodes"]): BuiltTreeNode[] {
  const byId = new Map<string, BuiltTreeNode>();
  for (const n of nodes) byId.set(n.id, { ...n, children: [] });
  const roots: BuiltTreeNode[] = [];
  for (const n of nodes) {
    const node = byId.get(n.id);
    if (!node) continue;
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function AskTreeBranch({
  nodes,
  depth,
  openIds,
  toggle,
}: {
  nodes: BuiltTreeNode[];
  depth: number;
  openIds: Set<string>;
  toggle: (id: string) => void;
}) {
  return (
    <ul className={cn(depth > 0 && "ml-2.5 border-l border-border/70 pl-2.5")}>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = openIds.has(node.id);
        return (
          <li key={node.id} className="py-0.5">
            <div className="flex items-center gap-1.5">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-0.5 py-0.5 text-left hover:text-brand-teal"
                >
                  <ChevronRightIcon
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                  <span className="truncate text-sm font-medium text-foreground">{node.label}</span>
                  {node.detail && (
                    <span className="truncate text-xs text-muted-foreground">— {node.detail}</span>
                  )}
                  {node.badge && (
                    <Badge variant="secondary" className="shrink-0">
                      {node.badge}
                    </Badge>
                  )}
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-1.5 px-0.5 py-0.5">
                  <span className="ml-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  <span className="truncate text-sm text-foreground">{node.label}</span>
                  {node.detail && (
                    <span className="truncate text-xs text-muted-foreground">— {node.detail}</span>
                  )}
                  {node.badge && (
                    <Badge variant="secondary" className="shrink-0">
                      {node.badge}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {hasChildren && isOpen && (
              <AskTreeBranch
                nodes={node.children}
                depth={depth + 1}
                openIds={openIds}
                toggle={toggle}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AskTreeBlock({ data }: { data: AskTree }) {
  const forest = useMemo(() => buildForest(data.nodes), [data.nodes]);
  const allIds = useMemo(() => data.nodes.map((n) => n.id), [data.nodes]);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(allIds));

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <SectionCard title={data.title}>
      <div className="mb-2 flex justify-end gap-1">
        <Button size="xs" variant="ghost" onClick={() => setOpenIds(new Set(allIds))}>
          <ChevronsUpDownIcon />
          Expand all
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setOpenIds(new Set())}>
          <ChevronsDownUpIcon />
          Collapse all
        </Button>
      </div>
      <AskTreeBranch nodes={forest} depth={0} openIds={openIds} toggle={toggle} />
    </SectionCard>
  );
}

// ── Flow / graph (interactive: click a node to trace its connections) ──────────
const FLOW_KIND: Record<AskFlowNodeKind, string> = {
  start: "border-success/40 bg-success/10 text-success",
  step: "border-border bg-card text-foreground",
  decision: "border-warning/40 bg-warning/10 text-warning",
  io: "border-brand-info/40 bg-brand-info-soft/60 text-brand-info",
  end: "border-brand-teal/40 bg-brand-teal-soft/60 text-brand-teal",
};

/** Longest-path layering (Kahn) so dependencies always sit above dependents; cycles degrade gracefully. */
function layerNodes(data: AskFlow): AskFlow["nodes"][] {
  const ids = data.nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const edges = data.edges.filter((e) => idSet.has(e.from) && idSet.has(e.to) && e.from !== e.to);
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of edges) {
    out.get(e.from)?.push(e.to);
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  }
  const layer = new Map<string, number>(ids.map((id) => [id, 0]));
  let queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const seen = new Set(queue);
  while (queue.length) {
    const next: string[] = [];
    for (const id of queue) {
      for (const to of out.get(id) ?? []) {
        layer.set(to, Math.max(layer.get(to) ?? 0, (layer.get(id) ?? 0) + 1));
        const deg = (indegree.get(to) ?? 0) - 1;
        indegree.set(to, deg);
        if (deg <= 0 && !seen.has(to)) {
          seen.add(to);
          next.push(to);
        }
      }
    }
    queue = next;
  }
  const maxLayer = Math.max(0, ...ids.map((id) => layer.get(id) ?? 0));
  const layers: AskFlow["nodes"][] = Array.from({ length: maxLayer + 1 }, () => []);
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  for (const id of ids) {
    const node = byId.get(id);
    if (node) layers[layer.get(id) ?? 0].push(node);
  }
  return layers.filter((l) => l.length > 0);
}

export function AskFlowBlock({ data }: { data: AskFlow }) {
  const layers = useMemo(() => layerNodes(data), [data]);
  const [focus, setFocus] = useState<string | null>(null);

  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const neighbors = useMemo(() => {
    if (!focus) return null;
    const set = new Set<string>();
    for (const e of data.edges) {
      if (e.from === focus) set.add(e.to);
      if (e.to === focus) set.add(e.from);
    }
    return set;
  }, [focus, data.edges]);

  const focusNode = focus ? byId.get(focus) : null;
  const outgoing = focus ? data.edges.filter((e) => e.from === focus) : [];
  const incoming = focus ? data.edges.filter((e) => e.to === focus) : [];

  return (
    <SectionCard title={data.title}>
      <div className="space-y-1">
        {layers.map((row, li) => (
          <div key={`layer-${li}`}>
            <div className="flex flex-wrap items-stretch justify-center gap-2">
              {row.map((node) => {
                const isFocus = node.id === focus;
                const isNeighbor = neighbors?.has(node.id) ?? false;
                const dim = focus !== null && !isFocus && !isNeighbor;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setFocus((f) => (f === node.id ? null : node.id))}
                    className={cn(
                      "max-w-[16rem] rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all",
                      FLOW_KIND[node.kind ?? "step"],
                      dim && "opacity-40",
                      isNeighbor && "ring-1 ring-brand-teal/50",
                      isFocus && "ring-2 ring-brand-honey",
                    )}
                  >
                    {node.label}
                  </button>
                );
              })}
            </div>
            {li < layers.length - 1 && (
              <div className="flex justify-center py-0.5 text-muted-foreground/50" aria-hidden>
                <ArrowDownIcon className="size-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {focusNode ? (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{focusNode.label}</span>
            <button
              type="button"
              aria-label="Clear selection"
              onClick={() => setFocus(null)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          {focusNode.detail && (
            <p className="mt-1 text-sm text-muted-foreground">{focusNode.detail}</p>
          )}
          {(incoming.length > 0 || outgoing.length > 0) && (
            <div className="mt-2 space-y-1">
              {incoming.map((e, i) => (
                <div
                  key={`in-${i}-${e.from}`}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <ArrowRightIcon className="size-3 shrink-0 text-brand-teal" />
                  <span className="font-medium text-foreground">{byId.get(e.from)?.label}</span>
                  {e.label && <span className="text-brand-teal">({e.label})</span>}
                  <span>→ this</span>
                </div>
              ))}
              {outgoing.map((e, i) => (
                <div
                  key={`out-${i}-${e.to}`}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <ArrowRightIcon className="size-3 shrink-0 text-brand-honey" />
                  <span>this →</span>
                  <span className="font-medium text-foreground">{byId.get(e.to)?.label}</span>
                  {e.label && <span className="text-brand-honey">({e.label})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          Tap a node to trace its connections
        </p>
      )}
    </SectionCard>
  );
}
