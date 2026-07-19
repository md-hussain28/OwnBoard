"use client";

import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  LightbulbIcon,
  QuoteIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib";
import type {
  AskAccordion,
  AskActions,
  AskBadges,
  AskGlossary,
  AskKeyTakeaways,
  AskQuote,
} from "@/schemas";
import { Input } from "@/ui";
import { useAskDoc } from "./ask-doc-viewer";
import { useAskFollowup } from "./ask-followup";
import { SectionCard } from "./ask-visuals";

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
