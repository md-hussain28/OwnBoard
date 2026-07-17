"use client";

import { CheckIcon, Loader2Icon, RotateCcwIcon, Undo2Icon, XIcon } from "lucide-react";
import type { EditableQuestion } from "@/components/doc-pack/quiz-builder-types";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";

type QuizQuestionEditorProps = {
  questions: EditableQuestion[];
  keptCount: number;
  droppedIds: string[];
  isPublished: boolean;
  openBook: boolean;
  onOpenBookChange: (value: boolean) => void;
  busy: boolean;
  regeneratePending: boolean;
  savePending: boolean;
  onUpdateQuestion: (id: string, patch: Partial<EditableQuestion>) => void;
  onUpdateOption: (id: string, index: number, value: string) => void;
  onRegenerateDropped: () => void;
  onSave: () => void;
};

export function QuizQuestionEditor({
  questions,
  keptCount,
  droppedIds,
  isPublished,
  openBook,
  onOpenBookChange,
  busy,
  regeneratePending,
  savePending,
  onUpdateQuestion,
  onUpdateOption,
  onRegenerateDropped,
  onSave,
}: QuizQuestionEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {keptCount} kept · {droppedIds.length} dropped
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={openBook}
              disabled={isPublished}
              onChange={(e) => onOpenBookChange(e.target.checked)}
            />
            <span>
              Open-book quiz
              <span className="block text-xs text-muted-foreground">
                {openBook
                  ? "Reading stays available during the quiz"
                  : "Closed-book (default) — reading hides when the quiz starts"}
              </span>
            </span>
          </label>
          {droppedIds.length > 0 && (
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
          <Button
            type="button"
            size="sm"
            disabled={busy || keptCount === 0 || isPublished}
            onClick={onSave}
          >
            {savePending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Save quiz
          </Button>
        </div>
      </div>

      <ul className="space-y-3">
        {questions.map((question, index) => (
          <li
            key={question.id}
            className={cn(
              "space-y-3 rounded-xl border border-border p-4",
              question.dropped && "opacity-50",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="mt-2 text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
              <Textarea
                value={question.questionText}
                disabled={question.dropped || isPublished}
                onChange={(e) => onUpdateQuestion(question.id, { questionText: e.target.value })}
                className="min-h-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={question.dropped ? "Restore question" : "Drop question"}
                disabled={isPublished}
                onClick={() => onUpdateQuestion(question.id, { dropped: !question.dropped })}
              >
                {question.dropped ? (
                  <Undo2Icon className="size-4" />
                ) : (
                  <XIcon className="size-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            <div className="space-y-2 pl-7">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-7 rounded-full border",
                      option === question.correctAnswer
                        ? "border-success bg-success/10 text-success"
                        : "border-border text-transparent hover:text-muted-foreground",
                    )}
                    aria-label={`Mark option ${optionIndex + 1} as correct`}
                    disabled={question.dropped || isPublished}
                    onClick={() => onUpdateQuestion(question.id, { correctAnswer: option })}
                  >
                    <CheckIcon className="size-3.5" />
                  </Button>
                  <Input
                    value={option}
                    disabled={question.dropped || isPublished || question.format === "true_false"}
                    onChange={(e) => onUpdateOption(question.id, optionIndex, e.target.value)}
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                {question.format && (
                  <Badge variant="outline">
                    {question.format === "mcq_4" ? "MCQ" : "True/False"}
                  </Badge>
                )}
                {question.sourceCitation && (
                  <Badge variant="secondary">Cited: {question.sourceCitation}</Badge>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
