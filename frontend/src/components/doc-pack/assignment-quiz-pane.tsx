"use client";

import { Loader2Icon, LockIcon } from "lucide-react";
import { QuizQuestionCard } from "@/components/onboarding/quiz-question-card";
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
  gradePending: boolean;
  onStart: () => void;
  onAnswer: (questionId: string, option: string) => void;
  onSubmit: () => void;
};

function QuizStartPrompt({
  allAcked,
  startPending,
  onStart,
}: Pick<AssignmentQuizPaneProps, "allAcked" | "startPending" | "onStart">) {
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
    </>
  );
}

function QuizQuestionsForm({
  questions,
  answers,
  gradePending,
  onAnswer,
  onSubmit,
}: Pick<AssignmentQuizPaneProps, "answers" | "gradePending" | "onAnswer" | "onSubmit"> & {
  questions: QuizTemplate["questions"];
}) {
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
        onStart={props.onStart}
      />
    );
  }

  return (
    <QuizQuestionsForm
      questions={activeQuiz.template.questions}
      answers={props.answers}
      gradePending={props.gradePending}
      onAnswer={props.onAnswer}
      onSubmit={props.onSubmit}
    />
  );
}

export function AssignmentQuizPane(props: AssignmentQuizPaneProps) {
  const locked = !props.allAcked && !props.activeQuiz;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Quiz
          {locked && (
            <Badge variant="secondary">
              <LockIcon className="size-3" /> Locked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuizPaneBody {...props} />
      </CardContent>
    </Card>
  );
}
