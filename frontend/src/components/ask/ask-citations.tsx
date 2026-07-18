"use client";

import { ArrowUpRightIcon, CodeIcon, FileTextIcon, GitCommitHorizontalIcon } from "lucide-react";
import { cn } from "@/lib";
import type { AskCitations } from "@/schemas";
import { useAskDoc } from "./ask-doc-viewer";

const ICON = { doc: FileTextIcon, code: CodeIcon, commit: GitCommitHorizontalIcon };

export function AskCitationsBlock({ data }: { data: AskCitations }) {
  const { open } = useAskDoc();

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="mb-2 text-xs font-semibold text-muted-foreground">
        {data.title ?? "Sources"}
      </div>
      <div className="flex flex-col gap-1.5">
        {data.citations.map((c, i) => {
          const Icon = ICON[c.source];
          const openable = c.source === "doc" && !!c.documentId;
          return (
            <button
              key={`${i}-${c.title}`}
              type="button"
              onClick={() => open(c)}
              className={cn(
                "group/cite flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-colors",
                "hover:border-brand-teal/40 hover:bg-brand-teal-soft/30",
              )}
            >
              <Icon className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <span className="truncate">{c.title}</span>
                  <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/cite:opacity-100" />
                </span>
                {c.snippet && (
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                    {c.snippet}
                  </span>
                )}
                {!openable && c.filePath && (
                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {c.filePath}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
