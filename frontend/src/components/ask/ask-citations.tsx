"use client";

import {
  ArrowUpRightIcon,
  CodeIcon,
  FileTextIcon,
  GitCommitHorizontalIcon,
  QuoteIcon,
} from "lucide-react";
import { cn } from "@/lib";
import type { AskCitation, AskCitations } from "@/schemas";
import { useAskDoc } from "./ask-doc-viewer";

const ICON = { doc: FileTextIcon, code: CodeIcon, commit: GitCommitHorizontalIcon };
const SOURCE_LABEL = { doc: "Document", code: "Code", commit: "Commit" } as const;
const numStyle = { fontVariantNumeric: "tabular-nums" } as const;

/**
 * "Sources" panel that closes out a grounded answer. Rendered last in every assistant turn (hoisted by
 * `AskMessage`) so evidence always lands at the bottom. Teal is the design system's "verified / cited"
 * hue — the whole panel leans into it to read as the answer's proof-of-work. Doc citations open the
 * in-app viewer sheet; code/commit sources show their path inline.
 */
export function AskCitationsBlock({ data }: { data: AskCitations }) {
  const { open } = useAskDoc();
  const count = data.citations.length;

  return (
    <section className="overflow-hidden rounded-xl border border-brand-teal/25 bg-brand-teal-soft/15 shadow-soft">
      <header className="flex items-center gap-2 border-b border-brand-teal/15 px-3.5 py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-teal-soft text-brand-teal">
          <QuoteIcon className="size-3.5" />
        </span>
        <span className="font-heading text-sm font-semibold text-foreground">
          {data.title ?? "Sources"}
        </span>
        <span
          style={numStyle}
          className="ml-auto rounded-full bg-brand-teal-soft/70 px-2 py-0.5 text-xs font-semibold text-brand-teal"
        >
          {count} {count === 1 ? "source" : "sources"}
        </span>
      </header>

      <ol className="divide-y divide-brand-teal/10">
        {data.citations.map((c, i) => {
          const Icon = ICON[c.source];
          const openable = c.source === "doc" && !!c.documentId;
          const Wrapper = openable ? "button" : "div";
          return (
            <li key={`${i}-${c.title}`}>
              <Wrapper
                {...(openable
                  ? { type: "button" as const, onClick: () => open(c as AskCitation) }
                  : {})}
                className={cn(
                  "group/cite flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors",
                  openable && "hover:bg-brand-teal-soft/30",
                )}
              >
                <span
                  style={numStyle}
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-card font-heading text-xs font-bold text-brand-teal ring-1 ring-brand-teal/25"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3.5 shrink-0 text-brand-teal" />
                    <span className="truncate text-sm font-medium text-foreground">{c.title}</span>
                    {openable && (
                      <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/cite:opacity-100" />
                    )}
                  </span>
                  {c.snippet && (
                    <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                      {c.snippet}
                    </span>
                  )}
                  {c.filePath && (
                    <span className="mt-1 block truncate font-mono text-xs text-muted-foreground/80">
                      {c.filePath}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 shrink-0 rounded-full border border-brand-teal/20 px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-brand-teal/80">
                  {SOURCE_LABEL[c.source]}
                </span>
              </Wrapper>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
