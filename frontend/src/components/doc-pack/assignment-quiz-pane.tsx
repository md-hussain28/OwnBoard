"use client";

import { Loader2Icon, LockIcon } from "lucide-react";
import { QuizQuestionCard } from "@/components/onboarding/quiz-question-card";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { QuizAttempt, QuizTemplate } from "@/schemas/quiz.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

type AssignmentQuizPaneProps = {
  status: string;
  allAcked: boolean;
  activeQuiz: { attempt: QuizAttempt; template: QuizTemplate } | null;
  answers: Record<string, string>;
  startPending: boolean;
  startError: unknown;
  startIsError: boolean;
  gradePending: boolean;
  gradeError: unknown;
  gradeIsError: boolean;
  onStart: () => void;
  onAnswer: (questionId: string, option: string) => void;
  onSubmit: () => void;
};

function QuizStartPrompt({
  allAcked,
  startPending,
  startError,
  startIsError,
  onStart,
}: Pick<
  AssignmentQuizPaneProps,
  "allAcked" | "startPending" | "startError" | "startIsError" | "onStart"
>) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {allAcked
          ? "All documents acknowledged — the quiz is unlocked. It’s open-book: the reading pane stays available. You need 100% to pass, with unlimited retakes."
          : "Mark every document as read to unlock the quiz. It stays open-book once you start."}
      </p>
      <Button type="button" disabled={!allAcked || startPending} onClick={onStart}>
        {startPending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" /> Starting...
          </>
        ) : (
          "Start quiz"
        )}
      </Button>
      {startIsError && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(startError, "Could not start the quiz.")}
        </p>
      )}
    </>
  );
}

function QuizQuestionsForm({
  questions,
  answers,
  gradePending,
  gradeError,
  gradeIsError,
  onAnswer,
  onSubmit,
}: Pick<
  AssignmentQuizPaneProps,
  "answers" | "gradePending" | "gradeError" | "gradeIsError" | "onAnswer" | "onSubmit"
> & { questions: QuizTemplate["questions"] }) {
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  return (
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
            onSelect={(option) => onAnswer(question.id, option)}
          />
        </div>
      ))}
      <Button type="button" disabled={!allAnswered || gradePending} onClick={onSubmit}>
        {gradePending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" /> Grading...
          </>
        ) : (
          "Submit answers"
        )}
      </Button>
      {gradeIsError && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(gradeError, "Grading failed.")}
        </p>
      )}
    </div>
  );
}

function QuizPaneBody(props: AssignmentQuizPaneProps) {
  const { status, activeQuiz } = props;

  if (status === "passed" && !activeQuiz) {
    return (
      <p className="text-sm text-muted-foreground">
        You already passed this pack’s quiz. Nothing left to do here.
      </p>
    );
  }

  if (!activeQuiz) {
    return (
      <QuizStartPrompt
        allAcked={props.allAcked}
        startPending={props.startPending}
        startError={props.startError}
        startIsError={props.startIsError}
        onStart={props.onStart}
      />
    );
  }

  return (
    <QuizQuestionsForm
      questions={activeQuiz.template.questions}
      answers={props.answers}
      gradePending={props.gradePending}
      gradeError={props.gradeError}
      gradeIsError={props.gradeIsError}
      onAnswer={props.onAnswer}
      onSubmit={props.onSubmit}
    />
  );
}

export function AssignmentQuizPane(props: AssignmentQuizPaneProps) {
  const { status, allAcked } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {!allAcked && <LockIcon className="size-4 text-muted-foreground" />}
          Quiz
          {status === "passed" && <Badge>Passed</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuizPaneBody {...props} />
      </CardContent>
    </Card>
  );
}
