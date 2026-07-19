"use client";

import {
  ArrowDownIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib";
import type { AskFlow, AskFlowNodeKind, AskTree } from "@/schemas";
import { Badge, Button } from "@/ui";
import { SectionCard } from "./ask-visuals";

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

type LayeringState = {
  out: Map<string, string[]>;
  indegree: Map<string, number>;
  layer: Map<string, number>;
  seen: Set<string>;
  next: string[];
};

/** Push `id`'s successors one layer deeper; enqueue any whose indegree hits zero. */
function relaxOutgoing(id: string, state: LayeringState) {
  const { out, indegree, layer, seen, next } = state;
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

/** Kahn-style relaxation: assign each node the longest-path layer from the sources. */
function assignLayers(ids: string[], edges: AskFlow["edges"]): Map<string, number> {
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
    const state: LayeringState = { out, indegree, layer, seen, next: [] };
    for (const id of queue) relaxOutgoing(id, state);
    queue = state.next;
  }
  return layer;
}

/** Longest-path layering (Kahn) so dependencies always sit above dependents; cycles degrade gracefully. */
function layerNodes(data: AskFlow): AskFlow["nodes"][] {
  const ids = data.nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const edges = data.edges.filter((e) => idSet.has(e.from) && idSet.has(e.to) && e.from !== e.to);
  const layer = assignLayers(ids, edges);
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
