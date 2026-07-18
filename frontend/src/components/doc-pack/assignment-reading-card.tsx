"use client";

import {
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib";
import type { AssignmentDetail } from "@/schemas";
import { Badge, Button } from "@/ui";
import { AssignmentDocumentReader } from "./assignment-document-reader";

type AssignmentDocument = AssignmentDetail["documents"][number];

function docTabTone(done: boolean, selected: boolean) {
  if (done) return "bg-success/15 text-success";
  if (selected) return "bg-primary/20 text-foreground";
  return "bg-muted text-muted-foreground";
}

function DocumentTabs({
  documents,
  activeId,
  onSelect,
}: {
  documents: AssignmentDetail["documents"];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
      {documents.map((doc, index) => {
        const selected = doc.id === activeId;
        const done = Boolean(doc.acknowledgedAt);
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelect(doc.id)}
            className={cn(
              "flex min-w-0 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
              selected
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                docTabTone(done, selected),
              )}
            >
              {done ? <CheckCircle2Icon className="size-3" /> : index + 1}
            </span>
            <span className="max-w-[10rem] truncate font-medium sm:max-w-[14rem]">{doc.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActiveDocumentToolbar({
  activeDoc,
  activeIndex,
  total,
  canAck,
  hasViewed,
  ackPending,
  onPrev,
  onNext,
  onMarkRead,
}: {
  activeDoc: AssignmentDocument;
  activeIndex: number;
  total: number;
  canAck: boolean;
  hasViewed: boolean;
  ackPending: boolean;
  onPrev: () => void;
  onNext: () => void;
  onMarkRead: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-balance">{activeDoc.title}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {activeDoc.fileType.toUpperCase()} · Document {activeIndex + 1} of {total}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Previous document"
          disabled={activeIndex <= 0}
          onClick={onPrev}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Next document"
          disabled={activeIndex >= total - 1}
          onClick={onNext}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        {activeDoc.acknowledgedAt ? (
          <Badge>
            <CheckCircle2Icon className="size-3" /> Read
          </Badge>
        ) : (
          <Button type="button" size="sm" disabled={!canAck || ackPending} onClick={onMarkRead}>
            {ackPending && <Loader2Icon className="size-4 animate-spin" />}
            {!ackPending && (hasViewed ? "Mark as read" : "Open first")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function AssignmentReadingCard({
  detail,
  allAcked,
  ackPending,
  viewedIds,
  onOpened,
  onAck,
}: {
  detail: AssignmentDetail;
  allAcked: boolean;
  ackPending: boolean;
  viewedIds: Set<string>;
  onOpened: (documentId: string) => void;
  onAck: (documentId: string) => void;
}) {
  const firstUnread = detail.documents.find((d) => !d.acknowledgedAt)?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(
    firstUnread ?? detail.documents[0]?.id ?? null,
  );

  const activeIndex = useMemo(
    () => detail.documents.findIndex((d) => d.id === activeId),
    [detail.documents, activeId],
  );
  const activeDoc = activeIndex >= 0 ? detail.documents[activeIndex] : null;
  const ackedCount = detail.documents.filter((d) => d.acknowledgedAt).length;
  const hasViewed = activeDoc
    ? viewedIds.has(activeDoc.id) || Boolean(activeDoc.acknowledgedAt)
    : false;
  const canAck = Boolean(activeDoc && !activeDoc.acknowledgedAt && hasViewed);

  function handleMarkRead() {
    if (!activeDoc) return;
    onAck(activeDoc.id);
    const nextUnread = detail.documents.find((d, i) => i > activeIndex && !d.acknowledgedAt);
    if (nextUnread) setActiveId(nextUnread.id);
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold tracking-tight">Reading</h2>
          <Badge variant={allAcked ? "default" : "secondary"} className="tabular-nums">
            {ackedCount}/{detail.documents.length}
          </Badge>
        </div>
        {!allAcked && (
          <p className="text-sm text-muted-foreground text-pretty">
            Open each document, then mark it as read. The quiz unlocks when every document is done.
          </p>
        )}
      </div>

      {detail.documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">This pack has no documents.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <DocumentTabs documents={detail.documents} activeId={activeId} onSelect={setActiveId} />

          {activeDoc && (
            <>
              <ActiveDocumentToolbar
                activeDoc={activeDoc}
                activeIndex={activeIndex}
                total={detail.documents.length}
                canAck={canAck}
                hasViewed={hasViewed}
                ackPending={ackPending}
                onPrev={() => setActiveId(detail.documents[activeIndex - 1]?.id ?? null)}
                onNext={() => setActiveId(detail.documents[activeIndex + 1]?.id ?? null)}
                onMarkRead={handleMarkRead}
              />
              <AssignmentDocumentReader
                assignmentId={detail.id}
                documentId={activeDoc.id}
                title={activeDoc.title}
                onOpened={onOpened}
                className="rounded-none bg-muted/20"
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}
