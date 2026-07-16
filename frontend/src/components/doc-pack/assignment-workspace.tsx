"use client";

import { useState } from "react";
import { BookOpenIcon, CheckCircle2Icon, Loader2Icon, LockIcon, XCircleIcon } from "lucide-react";
import {
  useAssignmentDetail,
  useAssignmentDocumentContent,
} from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import {
  useAckDocument,
  useStartQuiz,
} from "@/hooks/queries/pack-assignment/pack-assignment.mutations";
import { useGradeAttempt } from "@/hooks/queries/quiz/quiz.mutations";
import { QuizQuestionCard } from "@/components/onboarding/quiz-question-card";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";
import type { QuizAttempt, QuizTemplate } from "@/schemas/quiz.schema";
import { getApiErrorMessage } from "@/lib/api/errors";

function DocumentReader({
  assignmentId,
  documentId,
  title,
}: {
  assignmentId: string;
  documentId: string;
  title: string;
}) {
  const { data, isLoading, isError } = useAssignmentDocumentContent(assignmentId, documentId);

  return (
    <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      )}
      {isError && <p className="text-sm text-muted-foreground">Could not load “{title}”.</p>}
      {data && <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.content}</p>}
    </div>
  );
}

export function AssignmentWorkspace({ assignmentId }: { assignmentId: string }) {
  const { data: detail, isLoading, isError } = useAssignmentDetail(assignmentId);
  const ack = useAckDocument(assignmentId);
  const startQuiz = useStartQuiz(assignmentId);
  const grade = useGradeAttempt();

  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<{ attempt: QuizAttempt; template: QuizTemplate } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);

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

  const ackedCount = detail.documents.filter((d) => d.acknowledgedAt).length;
  const allAcked = detail.quizUnlocked;
  const questions = activeQuiz?.template.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  function handleStartQuiz() {
    setResult(null);
    setAnswers({});
    startQuiz.mutate(undefined, {
      onSuccess: (data) => setActiveQuiz(data),
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
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Result banner */}
      {result && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4",
            result.passed
              ? "border-success/40 bg-success/5"
              : "border-destructive/40 bg-destructive/5",
          )}
        >
          {result.passed ? (
            <CheckCircle2Icon className="size-5 shrink-0 text-success" />
          ) : (
            <XCircleIcon className="size-5 shrink-0 text-destructive" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {result.passed ? "Passed — 100%" : `Not passed — ${Math.round((result.score ?? 0) * 100)}%`}
            </p>
            <p className="text-sm text-muted-foreground">
              {result.passed
                ? "This pack is complete."
                : "Every question must be correct to pass. The documents stay open — review and retake."}
            </p>
          </div>
          {!result.passed && (
            <Button type="button" size="sm" onClick={handleStartQuiz} disabled={startQuiz.isPending}>
              {startQuiz.isPending ? <Loader2Icon className="size-4 animate-spin" /> : "Retake quiz"}
            </Button>
          )}
        </div>
      )}

      <div className={cn("grid gap-6", activeQuiz && "lg:grid-cols-2")}>
        {/* Reading pane — stays available during the quiz (open-book, PRD §10.5) */}
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
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.documents.length === 0 && (
              <p className="text-sm text-muted-foreground">This pack has no documents.</p>
            )}
            {detail.documents.map((doc) => {
              const isOpen = openDocumentId === doc.id;
              return (
                <div key={doc.id} className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setOpenDocumentId(isOpen ? null : doc.id)}
                    >
                      <p className="truncate font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileType.toUpperCase()} · {isOpen ? "Hide" : "Open"}
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
                        disabled={ack.isPending}
                        onClick={() => ack.mutate(doc.id)}
                      >
                        {ack.isPending ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          "Mark as read"
                        )}
                      </Button>
                    )}
                  </div>
                  {isOpen && (
                    <DocumentReader assignmentId={detail.id} documentId={doc.id} title={doc.title} />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quiz pane */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {!allAcked && <LockIcon className="size-4 text-muted-foreground" />}
              Quiz
              {detail.status === "passed" && <Badge>Passed</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.status === "passed" && !activeQuiz ? (
              <p className="text-sm text-muted-foreground">
                You already passed this pack’s quiz. Nothing left to do here.
              </p>
            ) : !activeQuiz ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {allAcked
                    ? "All documents acknowledged — the quiz is unlocked. It’s open-book: the reading pane stays available. You need 100% to pass, with unlimited retakes."
                    : "Mark every document as read to unlock the quiz. It stays open-book once you start."}
                </p>
                <Button
                  type="button"
                  disabled={!allAcked || startQuiz.isPending}
                  onClick={handleStartQuiz}
                >
                  {startQuiz.isPending ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" /> Starting...
                    </>
                  ) : (
                    "Start quiz"
                  )}
                </Button>
                {startQuiz.isError && (
                  <p className="text-sm text-destructive">
                    {getApiErrorMessage(startQuiz.error, "Could not start the quiz.")}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Question {index + 1} of {questions.length}
                    </p>
                    <QuizQuestionCard
                      questionText={question.questionText}
                      options={question.options}
                      sourceCitation={question.sourceCitation}
                      selected={answers[question.id] ?? null}
                      onSelect={(option) =>
                        setAnswers((prev) => ({ ...prev, [question.id]: option }))
                      }
                    />
                  </div>
                ))}
                <Button type="button" disabled={!allAnswered || grade.isPending} onClick={handleSubmit}>
                  {grade.isPending ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" /> Grading...
                    </>
                  ) : (
                    "Submit answers"
                  )}
                </Button>
                {grade.isError && (
                  <p className="text-sm text-destructive">
                    {getApiErrorMessage(grade.error, "Grading failed.")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
