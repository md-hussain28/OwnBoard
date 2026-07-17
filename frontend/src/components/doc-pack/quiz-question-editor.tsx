"use client";

import {
  BookOpenIcon,
  CheckIcon,
  EyeOffIcon,
  Loader2Icon,
  PlusIcon,
  RotateCcwIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { type EditableQuestion, FORMAT_LABEL } from "@/components/doc-pack/quiz-builder-types";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";

type QuizQuestionEditorProps = {
  questions: EditableQuestion[];
  keptCount: number;
  droppedIds: string[];
  incompleteCount: number;
  canSave: boolean;
  isPublished: boolean;
  openBook: boolean;
  onOpenBookChange: (value: boolean) => void;
  busy: boolean;
  regeneratePending: boolean;
  savePending: boolean;
  onUpdateQuestion: (id: string, patch: Partial<EditableQuestion>) => void;
  onUpdateOption: (id: string, index: number, value: string) => void;
  onAddOption: (id: string) => void;
  onRemoveOption: (id: string, index: number) => void;
  onSetCorrect: (id: string, option: string) => void;
  onAddQuestion: () => void;
  onRegenerateDropped: () => void;
  onSave: () => void;
};

const MAX_OPTIONS = 6;

function isOptionCorrect(question: EditableQuestion, option: string): boolean {
  return question.format === "multi_select"
    ? question.correctAnswers.includes(option)
    : question.correctAnswer === option;
}

function QuizModeControl({
  openBook,
  onChange,
}: {
  openBook: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2" aria-labelledby="quiz-mode-heading">
      <div className="space-y-0.5">
        <h3 id="quiz-mode-heading" className="text-sm font-medium">
          Quiz mode
        </h3>
        <p className="text-xs text-muted-foreground text-pretty">
          Choose whether hires can consult the reading while answering.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="quiz-mode-heading"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!openBook}
          onClick={() => onChange(false)}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-[color,background-color,border-color] duration-150 ease-out",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            !openBook
              ? "border-primary/50 bg-primary/5"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          <EyeOffIcon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              !openBook ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Closed book</span>
            <span className="block text-xs text-muted-foreground text-pretty">
              Reading hides once the quiz starts.
            </span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={openBook}
          onClick={() => onChange(true)}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-[color,background-color,border-color] duration-150 ease-out",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            openBook
              ? "border-primary/50 bg-primary/5"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          <BookOpenIcon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              openBook ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Open book</span>
            <span className="block text-xs text-muted-foreground text-pretty">
              Reading stays available beside the quiz.
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onUpdateQuestion,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onSetCorrect,
}: {
  question: EditableQuestion;
  index: number;
} & Pick<
  QuizQuestionEditorProps,
  "onUpdateQuestion" | "onUpdateOption" | "onAddOption" | "onRemoveOption" | "onSetCorrect"
>) {
  const multi = question.format === "multi_select";
  const trueFalse = question.format === "true_false";

  return (
    <li
      className={cn(
        "space-y-3 rounded-xl border p-4",
        question.dropped ? "border-border opacity-50" : "border-border",
        question.isNew && !question.dropped && "border-brand-honey/40 bg-brand-honey-soft/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="mt-2 text-xs font-semibold text-muted-foreground tabular-nums">
          Q{index + 1}
        </span>
        <Textarea
          value={question.questionText}
          disabled={question.dropped}
          placeholder="Write the question…"
          onChange={(e) => onUpdateQuestion(question.id, { questionText: e.target.value })}
          className="min-h-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={question.dropped ? "Restore question" : "Remove question"}
          onClick={() => onUpdateQuestion(question.id, { dropped: !question.dropped })}
        >
          {question.dropped ? (
            <Undo2Icon className="size-4" />
          ) : (
            <XIcon className="size-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {!question.dropped && (
        <div className="space-y-3 pl-7">
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => {
              const correct = isOptionCorrect(question, option) && option.trim() !== "";
              return (
                <div key={optionIndex} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-7 border",
                      multi ? "rounded-md" : "rounded-full",
                      correct
                        ? "border-success bg-success/10 text-success"
                        : "border-border text-transparent hover:text-muted-foreground",
                    )}
                    aria-label={`Mark option ${optionIndex + 1} ${correct ? "incorrect" : "correct"}`}
                    aria-pressed={correct}
                    onClick={() => onSetCorrect(question.id, option)}
                  >
                    <CheckIcon className="size-3.5" />
                  </Button>
                  <Input
                    value={option}
                    disabled={trueFalse}
                    placeholder={`Option ${optionIndex + 1}`}
                    onChange={(e) => onUpdateOption(question.id, optionIndex, e.target.value)}
                  />
                  {!trueFalse && question.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove option ${optionIndex + 1}`}
                      onClick={() => onRemoveOption(question.id, optionIndex)}
                    >
                      <XIcon className="size-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              );
            })}
            {!trueFalse && question.options.length < MAX_OPTIONS && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => onAddOption(question.id)}
              >
                <PlusIcon className="size-4" />
                Add option
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{question.format ? FORMAT_LABEL[question.format] : "—"}</Badge>
            {multi && (
              <span className="text-xs text-muted-foreground">
                Tick every correct option — graded on an exact match.
              </span>
            )}
            {question.sourceCitation && (
              <Badge variant="secondary">Cited: {question.sourceCitation}</Badge>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function QuizQuestionEditor({
  questions,
  keptCount,
  droppedIds,
  incompleteCount,
  canSave,
  isPublished,
  openBook,
  onOpenBookChange,
  busy,
  regeneratePending,
  savePending,
  onUpdateQuestion,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onSetCorrect,
  onAddQuestion,
  onRegenerateDropped,
  onSave,
}: QuizQuestionEditorProps) {
  const hasRegenerable = droppedIds.length > 0 && !isPublished;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          <span>
            {keptCount} question{keptCount === 1 ? "" : "s"} · {droppedIds.length} dropped
          </span>
          {incompleteCount > 0 && (
            <span className="ml-2 text-warning">
              {incompleteCount} need{incompleteCount === 1 ? "s" : ""} a question, options, and a
              correct answer
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasRegenerable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onRegenerateDropped}
            >
              {regeneratePending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RotateCcwIcon className="size-4" />
              )}
              Regenerate dropped
            </Button>
          )}
          <Button type="button" size="sm" disabled={busy || !canSave} onClick={onSave}>
            {savePending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            {isPublished ? "Save changes" : "Publish quiz"}
          </Button>
        </div>
      </div>

      <QuizModeControl openBook={openBook} onChange={onOpenBookChange} />

      {isPublished && (
        <p className="rounded-lg border border-brand-teal/30 bg-accent/40 px-3 py-2 text-xs text-accent-foreground">
          This quiz is live. Edits and new questions take effect for anyone who hasn&apos;t started
          it yet the moment you save.
        </p>
      )}

      <ul className="space-y-3">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            onUpdateQuestion={onUpdateQuestion}
            onUpdateOption={onUpdateOption}
            onAddOption={onAddOption}
            onRemoveOption={onRemoveOption}
            onSetCorrect={onSetCorrect}
          />
        ))}
      </ul>

      <Button type="button" variant="outline" size="sm" onClick={onAddQuestion}>
        <PlusIcon className="size-4" />
        Add question
      </Button>
    </div>
  );
}
