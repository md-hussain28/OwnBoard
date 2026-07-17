"use client";

import { BookOpenIcon, CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { AssignmentDocumentReader } from "@/components/doc-pack/assignment-document-reader";
import { AssignmentQuizPane } from "@/components/doc-pack/assignment-quiz-pane";
import {
  useAckDocument,
  useStartQuiz,
} from "@/hooks/queries/pack-assignment/pack-assignment.mutations";
import { useAssignmentDetail } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { useGradeAttempt } from "@/hooks/queries/quiz/quiz.mutations";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AssignmentDetail } from "@/schemas/packAssignment.schema";
import type { QuizAttempt, QuizTemplate } from "@/schemas/quiz.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

function QuizResultBanner({
  result,
  retakePending,
  onRetake,
}: {
  result: QuizAttempt;
  retakePending: boolean;
  onRetake: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4",
        result.passed ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5",
      )}
    >
      {result.passed ? (
        <CheckCircle2Icon className="size-5 shrink-0 text-success" />
      ) : (
        <XCircleIcon className="size-5 shrink-0 text-destructive" />
      )}
      <div className="flex-1">
        <p className="font-medium">
          {result.passed
            ? "Passed — 100%"
            : `Not passed — ${Math.round((result.score ?? 0) * 100)}%`}
        </p>
        <p className="text-sm text-muted-foreground">
          {result.passed
            ? "This pack is complete."
            : "Every question must be correct to pass. Review the documents and retake."}
        </p>
      </div>
      {!result.passed && (
        <Button type="button" size="sm" onClick={onRetake} disabled={retakePending}>
          {retakePending ? <Loader2Icon className="size-4 animate-spin" /> : "Retake quiz"}
        </Button>
      )}
    </div>
  );
}

function ReadingDocumentRow({
  assignmentId,
  doc,
  isOpen,
  hasViewed,
  ackPending,
  onToggle,
  onOpened,
  onAck,
}: {
  assignmentId: string;
  doc: AssignmentDetail["documents"][number];
  isOpen: boolean;
  hasViewed: boolean;
  ackPending: boolean;
  onToggle: () => void;
  onOpened: (documentId: string) => void;
  onAck: () => void;
}) {
  const canAck = !doc.acknowledgedAt && hasViewed;

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onToggle}>
          <p className="truncate font-medium">{doc.title}</p>
          <p className="text-xs text-muted-foreground">
            {doc.fileType.toUpperCase()} · {isOpen ? "Hide" : "Open to read"}
          </p>
        </button>
        {doc.acknowledgedAt ? (
          <Badge>
            <CheckCircle2Icon className="size-3" /> Read
          </Badge>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canAck || ackPending}
            onClick={onAck}
          >
            {ackPending && <Loader2Icon className="size-4 animate-spin" />}
            {!ackPending && (hasViewed ? "Mark as read" : "Open first")}
          </Button>
        )}
      </div>
      {isOpen && (
        <AssignmentDocumentReader
          assignmentId={assignmentId}
          documentId={doc.id}
          title={doc.title}
          onOpened={onOpened}
        />
      )}
    </div>
  );
}

function ReadingCard({
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
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(firstUnread);
  const ackedCount = detail.documents.filter((d) => d.acknowledgedAt).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpenIcon className="size-4" /> Reading
          </span>
          <Badge variant={allAcked ? "default" : "secondary"}>
            {ackedCount}/{detail.documents.length} read
          </Badge>
        </CardTitle>
        {!allAcked && (
          <p className="text-sm font-normal text-muted-foreground">
            Open each document (PDF opens in the viewer), then mark it as read. The quiz unlocks
            only after every document is acknowledged.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {detail.documents.length === 0 && (
          <p className="text-sm text-muted-foreground">This pack has no documents.</p>
        )}
        {detail.documents.map((doc) => {
          const isOpen = openDocumentId === doc.id;
          return (
            <ReadingDocumentRow
              key={doc.id}
              assignmentId={detail.id}
              doc={doc}
              isOpen={isOpen}
              hasViewed={viewedIds.has(doc.id) || Boolean(doc.acknowledgedAt)}
              ackPending={ackPending}
              onToggle={() => setOpenDocumentId(isOpen ? null : doc.id)}
              onOpened={onOpened}
              onAck={() => onAck(doc.id)}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

export function AssignmentWorkspace({ assignmentId }: { assignmentId: string }) {
  const { data: detail, isLoading, isError } = useAssignmentDetail(assignmentId);
  const ack = useAckDocument(assignmentId);
  const startQuiz = useStartQuiz(assignmentId);
  const grade = useGradeAttempt();

  const [activeQuiz, setActiveQuiz] = useState<{
    attempt: QuizAttempt;
    template: QuizTemplate;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => new Set());

  const markViewed = useCallback((documentId: string) => {
    setViewedIds((prev) => {
      if (prev.has(documentId)) return prev;
      const next = new Set(prev);
      next.add(documentId);
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load this assignment. Start the FastAPI service and refresh.
      </p>
    );
  }

  const allAcked = detail.quizUnlocked;
  const questions = activeQuiz?.template.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);
  // Read-first: hide the quiz pane until every document is acknowledged (unless already in a quiz / passed).
  const showQuizPane =
    allAcked || Boolean(activeQuiz) || detail.status === "passed" || detail.status === "failed";
  const openBook = activeQuiz?.template.openBook ?? false;
  // Closed-book (default): hide reading materials while the quiz is in progress.
  const showReading = !(activeQuiz && !openBook);

  function handleStartQuiz() {
    setResult(null);
    setAnswers({});
    startQuiz.mutate(undefined, {
      onSuccess: (data) => {
        setActiveQuiz(data);
        notify.info("Quiz started", {
          description: data.template.openBook
            ? "Open-book — the reading pane stays available."
            : "Closed-book — reading materials are hidden until you finish.",
          id: `quiz-start:${assignmentId}`,
        });
      },
      onError: (err) => {
        notify.apiError(err, "Could not start the quiz", {
          id: `quiz-start-error:${assignmentId}`,
        });
      },
    });
  }

  function handleSubmit() {
    if (!activeQuiz || !allAnswered) return;
    grade.mutate(
      { attemptId: activeQuiz.attempt.id, answers },
      {
        onSuccess: (graded) => {
          setResult(graded);
          setActiveQuiz(null);
          if (graded.passed) {
            notify.success("Quiz passed", {
              description: "You are clear on this pack.",
              id: `quiz-grade:${assignmentId}`,
            });
          } else {
            notify.warning("Not quite — retake when ready", {
              description: "You need 100% to pass. Unlimited retakes.",
              id: `quiz-grade:${assignmentId}`,
            });
          }
        },
        onError: (err) => {
          notify.apiError(err, "Grading failed", { id: `quiz-grade-error:${assignmentId}` });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {result && (
        <QuizResultBanner
          result={result}
          retakePending={startQuiz.isPending}
          onRetake={handleStartQuiz}
        />
      )}

      <div
        className={cn("grid gap-6", showQuizPane && activeQuiz && showReading && "lg:grid-cols-2")}
      >
        {showReading ? (
          <ReadingCard
            detail={detail}
            allAcked={allAcked}
            ackPending={ack.isPending}
            viewedIds={viewedIds}
            onOpened={markViewed}
            onAck={(documentId) =>
              ack.mutate(documentId, {
                onSuccess: () => {
                  notify.success("Marked as read", { id: `ack:${documentId}` });
                },
                onError: (err) => {
                  notify.apiError(err, "Could not mark as read", { id: `ack-error:${documentId}` });
                },
              })
            }
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="size-4" /> Reading locked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is a closed-book quiz. Documents stay hidden until you submit your answers.
              </p>
            </CardContent>
          </Card>
        )}

        {showQuizPane ? (
          <AssignmentQuizPane
            status={detail.status}
            allAcked={allAcked}
            activeQuiz={activeQuiz}
            answers={answers}
            startPending={startQuiz.isPending}
            gradePending={grade.isPending}
            onStart={handleStartQuiz}
            onAnswer={(questionId, option) =>
              setAnswers((prev) => ({ ...prev, [questionId]: option }))
            }
            onSubmit={handleSubmit}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Finish reading every document above. The quiz appears only after you’ve opened and
                marked each one as read.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
