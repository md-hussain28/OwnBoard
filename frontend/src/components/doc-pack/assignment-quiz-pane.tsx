"use client";

import { Loader2Icon, LockIcon } from "lucide-react";
import { QuizQuestionCard } from "@/components/onboarding";
import type { QuizAttempt, QuizTemplate } from "@/schemas";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/ui";

type AssignmentQuizPaneProps = {
  status: string;
  allAcked: boolean;
  passPct?: number;
  activeQuiz: { attempt: QuizAttempt; template: QuizTemplate } | null;
  answers: Record<string, string | string[]>;
  startPending: boolean;
  gradePending: boolean;
  onStart: () => void;
  onAnswer: (questionId: string, value: string | string[]) => void;
  onSubmit: () => void;
};

function isAnswered(answer: string | string[] | undefined): boolean {
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
}

function QuizStartPrompt({
  allAcked,
  passPct,
  startPending,
  onStart,
}: Pick<AssignmentQuizPaneProps, "allAcked" | "passPct" | "startPending" | "onStart">) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {allAcked
          ? `All documents acknowledged — the quiz is unlocked. You need ${passPct ?? 100}% to pass, with unlimited retakes. Whether reading stays available depends on how your admin published this quiz.`
          : "Mark every document as read to unlock the quiz."}
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
  openBook,
  gradePending,
  onAnswer,
  onSubmit,
}: Pick<AssignmentQuizPaneProps, "answers" | "gradePending" | "onAnswer" | "onSubmit"> & {
  questions: QuizTemplate["questions"];
  openBook: boolean;
}) {
  const allAnswered = questions.length > 0 && questions.every((q) => isAnswered(answers[q.id]));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {openBook
          ? "Open-book — you can still consult the reading pane."
          : "Closed-book — reading materials are hidden until you submit."}
      </p>
      {questions.map((question, index) => (
        <div key={question.id} className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">
            Question {index + 1} of {questions.length}
          </p>
          <QuizQuestionCard
            questionText={question.questionText}
            options={question.options}
            multiple={question.format === "multi_select"}
            selected={answers[question.id] ?? (question.format === "multi_select" ? [] : null)}
            onSelect={(value) => onAnswer(question.id, value)}
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
        passPct={props.passPct}
        startPending={props.startPending}
        onStart={props.onStart}
      />
    );
  }

  return (
    <QuizQuestionsForm
      questions={activeQuiz.template.questions}
      answers={props.answers}
      openBook={activeQuiz.template.openBook}
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
