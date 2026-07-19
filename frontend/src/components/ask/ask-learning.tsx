"use client";

import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HelpCircleIcon,
  LinkIcon,
  RotateCwIcon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib";
import type { AskFlashcards, AskQuiz, AskResources, AskTabs } from "@/schemas";
import { Button } from "@/ui";
import { useAskDoc } from "./ask-doc-viewer";
import { SectionCard } from "./ask-visuals";

// ── Quiz (interactive knowledge check) ─────────────────────────────────────────
export function AskQuizBlock({ data }: { data: AskQuiz }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const isCorrect = picked === data.correctIndex;

  return (
    <SectionCard>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-brand-plum">
        <HelpCircleIcon className="size-3.5" />
        Quick check
      </div>
      <p className="mb-3 text-sm font-medium text-foreground">{data.question}</p>
      <div className="space-y-1.5">
        {data.options.map((opt, i) => {
          const correct = i === data.correctIndex;
          const chosen = i === picked;
          const showState = answered && (correct || chosen);
          let marker: React.ReactNode = String.fromCharCode(65 + i);
          if (showState && correct) marker = <CheckCircle2Icon className="size-3.5" />;
          else if (showState && chosen) marker = <XCircleIcon className="size-3.5" />;
          return (
            <button
              key={`${i}-${opt}`}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                !answered &&
                  "border-border bg-card hover:border-brand-teal/40 hover:bg-brand-teal-soft/20",
                showState && correct && "border-success/40 bg-success/5 text-success",
                showState &&
                  chosen &&
                  !correct &&
                  "border-destructive/40 bg-destructive/5 text-destructive",
                answered && !showState && "border-border bg-card text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  !showState && "border-border text-muted-foreground",
                  showState && correct && "border-success bg-success/10 text-success",
                  showState &&
                    chosen &&
                    !correct &&
                    "border-destructive bg-destructive/10 text-destructive",
                )}
              >
                {marker}
              </span>
              <span className="min-w-0 flex-1">{opt}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={cn(
            "mt-3 rounded-lg border p-3 text-sm",
            isCorrect
              ? "border-success/25 bg-success/5 text-foreground"
              : "border-warning/25 bg-warning/5 text-foreground",
          )}
        >
          <p className="font-semibold">{isCorrect ? "Correct!" : "Not quite."}</p>
          {data.explanation && <p className="mt-0.5 text-muted-foreground">{data.explanation}</p>}
          <Button size="xs" variant="ghost" className="mt-2" onClick={() => setPicked(null)}>
            Try again
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

// ── Tabs (interactive: switch panels) ──────────────────────────────────────────
export function AskTabsBlock({ data }: { data: AskTabs }) {
  const [active, setActive] = useState(0);
  const current = data.tabs[active] ?? data.tabs[0];
  return (
    <SectionCard title={data.title} className="p-0">
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 pt-2">
        {data.tabs.map((t, i) => (
          <button
            key={`${i}-${t.label}`}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
              i === active
                ? "border-b-2 border-brand-honey text-foreground"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="whitespace-pre-wrap px-4 py-3 text-sm text-muted-foreground">{current.body}</p>
    </SectionCard>
  );
}

// ── Flashcards (interactive: flip + navigate a deck) ───────────────────────────
export function AskFlashcardsBlock({ data }: { data: AskFlashcards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = data.cards[index];
  const total = data.cards.length;

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => (i + delta + total) % total);
  }

  return (
    <SectionCard title={data.title ?? "Key concepts"}>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-gradient-to-br from-brand-honey-soft/40 to-brand-teal-soft/30 p-5 text-center transition-colors hover:border-brand-honey/40"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {flipped ? "Definition" : "Term"}
        </span>
        <span className="text-sm font-medium text-foreground">
          {flipped ? card.back : card.front}
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-brand-teal">
          <RotateCwIcon className="size-3" />
          {flipped ? "Show term" : "Flip to reveal"}
        </span>
      </button>
      <div className="mt-3 flex items-center justify-between">
        <Button size="icon-sm" variant="outline" aria-label="Previous card" onClick={() => go(-1)}>
          <ChevronLeftIcon />
        </Button>
        <span className="text-xs font-medium text-muted-foreground">
          {index + 1} / {total}
        </span>
        <Button size="icon-sm" variant="outline" aria-label="Next card" onClick={() => go(1)}>
          <ChevronRightIcon />
        </Button>
      </div>
    </SectionCard>
  );
}

// ── Resources (interactive: open project docs / external links) ────────────────
const RESOURCE_ICON = { doc: FileTextIcon, code: CodeIcon, link: LinkIcon };

function resourceKind(r: AskResources["resources"][number]): "doc" | "code" | "link" {
  if (r.kind) return r.kind;
  if (r.documentId) return "doc";
  if (r.href) return "link";
  return "doc";
}

export function AskResourcesBlock({ data }: { data: AskResources }) {
  const { open } = useAskDoc();
  return (
    <SectionCard title={data.title ?? "Resources"}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.resources.map((r, i) => {
          const Icon = RESOURCE_ICON[resourceKind(r)];
          const openable = !!r.documentId;
          const content = (
            <>
              <Icon className="mt-0.5 size-4 shrink-0 text-brand-teal" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <span className="truncate">{r.label}</span>
                  {r.documentId ? (
                    <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    r.href && <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
                  )}
                </span>
                {r.description && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {r.description}
                  </span>
                )}
              </span>
            </>
          );
          const cls =
            "group/res flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-brand-teal/40 hover:bg-brand-teal-soft/20";

          if (openable) {
            return (
              <button
                key={`${i}-${r.label}`}
                type="button"
                onClick={() =>
                  open({
                    title: r.label,
                    source: "doc",
                    documentId: r.documentId,
                    snippet: r.description,
                  })
                }
                className={cls}
              >
                {content}
              </button>
            );
          }
          if (r.href) {
            return (
              <a
                key={`${i}-${r.label}`}
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className={cls}
              >
                {content}
              </a>
            );
          }
          return (
            <div key={`${i}-${r.label}`} className={cls}>
              {content}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
