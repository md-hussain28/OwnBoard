"use client";

import { BookOpenIcon, CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { AssignmentQuizPane } from "@/components/doc-pack/assignment-quiz-pane";
import { AssignmentReadingCard } from "@/components/doc-pack/assignment-reading-card";
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

function LockedCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}

function useAssignmentQuizFlow(assignmentId: string, detail: AssignmentDetail) {
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

  const allAcked = detail.quizUnlocked;
  const questions = activeQuiz?.template.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);
  const showQuizPane =
    allAcked || Boolean(activeQuiz) || detail.status === "passed" || detail.status === "failed";
  const openBook = activeQuiz?.template.openBook ?? false;
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

  function handleAck(documentId: string) {
    ack.mutate(documentId, {
      onSuccess: () => {
        notify.success("Marked as read", { id: `ack:${documentId}` });
      },
      onError: (err) => {
        notify.apiError(err, "Could not mark as read", { id: `ack-error:${documentId}` });
      },
    });
  }

  return {
    ackPending: ack.isPending,
    startPending: startQuiz.isPending,
    gradePending: grade.isPending,
    activeQuiz,
    answers,
    result,
    viewedIds,
    allAcked,
    showQuizPane,
    openBook,
    showReading,
    quizTakesFocus: Boolean(activeQuiz) && !openBook,
    markViewed,
    handleAck,
    handleStartQuiz,
    handleSubmit,
    setAnswer: (questionId: string, option: string) =>
      setAnswers((prev) => ({ ...prev, [questionId]: option })),
  };
}

function AssignmentWorkspaceLoaded({
  assignmentId,
  detail,
}: {
  assignmentId: string;
  detail: AssignmentDetail;
}) {
  const quiz = useAssignmentQuizFlow(assignmentId, detail);

  return (
    <div className="space-y-6">
      {quiz.result && (
        <QuizResultBanner
          result={quiz.result}
          retakePending={quiz.startPending}
          onRetake={quiz.handleStartQuiz}
        />
      )}

      <div
        className={cn(
          "grid gap-6",
          quiz.showQuizPane &&
            quiz.activeQuiz &&
            quiz.showReading &&
            quiz.openBook &&
            "lg:grid-cols-2",
          quiz.quizTakesFocus && "max-w-2xl",
        )}
      >
        {/* Keep the reading pane mounted (hidden) for closed-book — unmounting a PDF iframe stalls Start. */}
        <div className={cn(!quiz.showReading && "hidden")} aria-hidden={!quiz.showReading}>
          <AssignmentReadingCard
            detail={detail}
            allAcked={quiz.allAcked}
            ackPending={quiz.ackPending}
            viewedIds={quiz.viewedIds}
            onOpened={quiz.markViewed}
            onAck={quiz.handleAck}
          />
        </div>
        {!quiz.showReading && (
          <LockedCard title="Reading locked" icon={<BookOpenIcon className="size-4" />}>
            This is a closed-book quiz. Documents stay hidden until you submit your answers.
          </LockedCard>
        )}

        {quiz.showQuizPane ? (
          <AssignmentQuizPane
            status={detail.status}
            allAcked={quiz.allAcked}
            activeQuiz={quiz.activeQuiz}
            answers={quiz.answers}
            startPending={quiz.startPending}
            gradePending={quiz.gradePending}
            onStart={quiz.handleStartQuiz}
            onAnswer={quiz.setAnswer}
            onSubmit={quiz.handleSubmit}
          />
        ) : (
          <LockedCard title="Quiz">
            Finish reading every document above. The quiz appears only after you’ve opened and
            marked each one as read.
          </LockedCard>
        )}
      </div>
    </div>
  );
}

export function AssignmentWorkspace({ assignmentId }: { assignmentId: string }) {
  const { data: detail, isLoading, isError } = useAssignmentDetail(assignmentId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[min(72vh,40rem)] w-full rounded-2xl" />
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

  return <AssignmentWorkspaceLoaded assignmentId={assignmentId} detail={detail} />;
}
