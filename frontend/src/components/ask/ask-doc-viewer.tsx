"use client";

import { CodeIcon, FileTextIcon, GitCommitHorizontalIcon } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useProjectDocContent } from "@/hooks/queries/ask";
import { cn } from "@/lib";
import type { AskCitation } from "@/schemas";
import {
  Badge,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@/ui";

type AskDocContextValue = { open: (citation: AskCitation) => void };

const AskDocContext = createContext<AskDocContextValue | null>(null);

/** Any citation chip can call `useAskDoc().open(citation)` to open the source in the viewer sheet. */
export function useAskDoc(): AskDocContextValue {
  return useContext(AskDocContext) ?? { open: () => {} };
}

const SOURCE_ICON = { doc: FileTextIcon, code: CodeIcon, commit: GitCommitHorizontalIcon };

function DocBody({ projectId, citation }: { projectId: string; citation: AskCitation }) {
  const hasDoc = citation.source === "doc" && !!citation.documentId;
  const query = useProjectDocContent(projectId, citation.documentId ?? null, hasDoc);

  if (!hasDoc) {
    return (
      <div className="space-y-3">
        {citation.filePath && (
          <div className="font-mono text-xs text-muted-foreground">{citation.filePath}</div>
        )}
        {citation.snippet ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
            {citation.snippet}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            This source is a {citation.source} reference. Open the repository or commit history to
            view it in full.
          </p>
        )}
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-muted-foreground">Couldn't load this document's text.</p>;
  }

  const text = query.data.chunks.map((c) => c.content).join("\n\n");
  return (
    <div className="space-y-4">
      {citation.snippet && (
        <div className="rounded-lg border border-brand-teal/25 bg-brand-teal-soft/40 p-3">
          <div className="mb-1 text-xs font-semibold text-brand-teal">Cited passage</div>
          <p className="text-sm text-foreground">{citation.snippet}</p>
        </div>
      )}
      <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {text || "No extracted text is available for this document yet."}
      </article>
    </div>
  );
}

export function AskDocProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const [citation, setCitation] = useState<AskCitation | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((c: AskCitation) => {
    setCitation(c);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);
  const Icon = citation ? SOURCE_ICON[citation.source] : FileTextIcon;

  return (
    <AskDocContext.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
          <SheetHeader className="border-b">
            <div className="flex items-center gap-2 pr-8">
              <Icon className={cn("size-4 shrink-0 text-brand-teal")} />
              <SheetTitle className="truncate">{citation?.title ?? "Source"}</SheetTitle>
            </div>
            <SheetDescription className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {citation?.source ?? "source"}
              </Badge>
              <span>Grounding evidence for this answer</span>
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {citation && <DocBody projectId={projectId} citation={citation} />}
          </div>
        </SheetContent>
      </Sheet>
    </AskDocContext.Provider>
  );
}
