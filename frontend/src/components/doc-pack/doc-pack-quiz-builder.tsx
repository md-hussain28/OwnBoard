"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, Loader2Icon, RotateCcwIcon, SparklesIcon, Undo2Icon, XIcon } from "lucide-react";
import { useDocPackQuiz } from "@/hooks/queries/doc-pack/doc-pack.queries";
import {
  useGenerateQuiz,
  useRegenerateQuestions,
  useSaveQuiz,
} from "@/hooks/queries/doc-pack/doc-pack.mutations";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AdminQuizTemplate } from "@/schemas/quiz.schema";

type QuestionFormat = "mcq_4" | "true_false";

interface EditableQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  format: QuestionFormat | null;
  sourceCitation: string | null;
  dropped: boolean;
}

function toEditable(template: AdminQuizTemplate): EditableQuestion[] {
  return template.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    options: q.options,
    correctAnswer: q.correctAnswer,
    format: q.format,
    sourceCitation: q.sourceCitation,
    dropped: false,
  }));
}

export function DocPackQuizBuilder({
  packId,
  hasProcessedDocuments,
}: {
  packId: string;
  hasProcessedDocuments: boolean;
}) {
  const quizQuery = useDocPackQuiz(packId);
  const generate = useGenerateQuiz(packId);
  const regenerate = useRegenerateQuestions(packId);
  const save = useSaveQuiz(packId);

  // Generate-step form (Doc Pack PRD §10.13/§10.14)
  const [targetCount, setTargetCount] = useState(8);
  const [formats, setFormats] = useState<QuestionFormat[]>(["mcq_4"]);
  const [customInstructions, setCustomInstructions] = useState("");

  // A′ curation working copy, re-seeded whenever a new draft template arrives
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const template = quizQuery.data;
  useEffect(() => {
    if (template) setQuestions(toEditable(template));
  }, [template]);

  const rejectedSlots = generate.data?.rejectedSlots ?? [];
  const droppedIds = useMemo(
    () => questions.filter((q) => q.dropped).map((q) => q.id),
    [questions],
  );
  const keptQuestions = questions.filter((q) => !q.dropped);

  function toggleFormat(format: QuestionFormat) {
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );
  }

  function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    if (formats.length === 0) return;
    generate.mutate({
      target_count: targetCount,
      formats,
      custom_instructions: customInstructions.trim() || undefined,
    });
  }

  function updateQuestion(id: string, patch: Partial<EditableQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function updateOption(id: string, index: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const options = q.options.map((o, i) => (i === index ? value : o));
        const correctAnswer = q.correctAnswer === q.options[index] ? value : q.correctAnswer;
        return { ...q, options, correctAnswer };
      }),
    );
  }

  function handleSave() {
    if (keptQuestions.length === 0) return;
    save.mutate(
      keptQuestions.map((q) => ({
        id: q.id,
        question_text: q.questionText,
        options: q.options,
        correct_answer: q.correctAnswer,
        format: q.format,
        source_citation: q.sourceCitation,
      })),
    );
  }

  const busy = generate.isPending || regenerate.isPending || save.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Quiz
          {template?.isPublished && <Badge>Published</Badge>}
          {template && !template.isPublished && <Badge variant="secondary">Draft</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleGenerate} className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">
            {template ? "Regenerate the quiz" : "Generate a quiz from this pack"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              Questions
              <Input
                type="number"
                min={5}
                max={15}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-20"
              />
            </label>
            {(["mcq_4", "true_false"] as const).map((format) => (
              <Button
                key={format}
                type="button"
                size="sm"
                variant={formats.includes(format) ? "default" : "outline"}
                onClick={() => toggleFormat(format)}
              >
                {formats.includes(format) && <CheckIcon className="size-3.5" />}
                {format === "mcq_4" ? "4-option MCQ" : "True / False"}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="Optional instructions for the generator (tone, focus areas, ...)"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
          />
          <Button type="submit" disabled={busy || !hasProcessedDocuments || formats.length === 0}>
            {generate.isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="size-4" /> Generate quiz
              </>
            )}
          </Button>
          {!hasProcessedDocuments && (
            <p className="text-xs text-muted-foreground">
              Upload at least one document and wait for processing to finish first.
            </p>
          )}
          {generate.isError && (
            <p className="text-sm text-destructive">
              {generate.error instanceof Error ? generate.error.message : "Generation failed."}
            </p>
          )}
        </form>

        {rejectedSlots.length > 0 && (
          <div className="space-y-1 rounded-xl border border-warning/40 bg-warning/5 p-4">
            <p className="text-sm font-medium">
              {rejectedSlots.length} slot{rejectedSlots.length > 1 ? "s" : ""} could not produce a
              verifiable question:
            </p>
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {rejectedSlots.map((slot, i) => (
                <li key={i}>
                  {slot.citation}: {slot.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {quizQuery.isLoading && <Skeleton className="h-24 w-full" />}

        {!quizQuery.isLoading && !template && (
          <p className="text-sm text-muted-foreground">
            No quiz generated yet. Once documents are processed, generate one above, curate the
            questions, then save to make the pack assignable.
          </p>
        )}

        {template && questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {keptQuestions.length} kept · {droppedIds.length} dropped
              </p>
              <div className="flex gap-2">
                {droppedIds.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => regenerate.mutate(droppedIds)}
                  >
                    {regenerate.isPending ? (
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
                  disabled={busy || keptQuestions.length === 0 || template.isPublished}
                  onClick={handleSave}
                >
                  {save.isPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CheckIcon className="size-4" />
                  )}
                  Save quiz
                </Button>
              </div>
            </div>

            {regenerate.isError && (
              <p className="text-sm text-destructive">
                {regenerate.error instanceof Error
                  ? regenerate.error.message
                  : "Regeneration failed."}
              </p>
            )}
            {save.isError && (
              <p className="text-sm text-destructive">
                {save.error instanceof Error ? save.error.message : "Save failed."}
              </p>
            )}

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
                    <span className="mt-2 text-xs font-semibold text-muted-foreground">
                      Q{index + 1}
                    </span>
                    <Textarea
                      value={question.questionText}
                      disabled={question.dropped || template.isPublished}
                      onChange={(e) => updateQuestion(question.id, { questionText: e.target.value })}
                      className="min-h-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={question.dropped ? "Restore question" : "Drop question"}
                      disabled={template.isPublished}
                      onClick={() => updateQuestion(question.id, { dropped: !question.dropped })}
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
                          disabled={question.dropped || template.isPublished}
                          onClick={() => updateQuestion(question.id, { correctAnswer: option })}
                        >
                          <CheckIcon className="size-3.5" />
                        </Button>
                        <Input
                          value={option}
                          disabled={
                            question.dropped ||
                            template.isPublished ||
                            question.format === "true_false"
                          }
                          onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
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
        )}
      </CardContent>
    </Card>
  );
}
