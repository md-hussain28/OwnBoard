"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { EditableQuestion, QuestionFormat } from "@/components/doc-pack/quiz-builder-types";
import { QuizGenerateForm } from "@/components/doc-pack/quiz-generate-form";
import { QuizQuestionEditor } from "@/components/doc-pack/quiz-question-editor";
import {
  useGenerateQuiz,
  useRegenerateQuestions,
  useSaveQuiz,
} from "@/hooks/queries/doc-pack/doc-pack.mutations";
import { useDocPackQuiz } from "@/hooks/queries/doc-pack/doc-pack.queries";
import type { AdminQuizTemplate } from "@/schemas/quiz.schema";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

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

function withUpdatedOption(
  questions: EditableQuestion[],
  id: string,
  index: number,
  value: string,
): EditableQuestion[] {
  return questions.map((q) => {
    if (q.id !== id) return q;
    const options = q.options.map((o, i) => (i === index ? value : o));
    const correctAnswer = q.correctAnswer === q.options[index] ? value : q.correctAnswer;
    return { ...q, options, correctAnswer };
  });
}

function toSavePayload(questions: EditableQuestion[]) {
  return questions.map((q) => ({
    id: q.id,
    question_text: q.questionText,
    options: q.options,
    correct_answer: q.correctAnswer,
    format: q.format,
    source_citation: q.sourceCitation,
  }));
}

function RejectedSlotsNotice({ slots }: { slots: { citation: string; reason: string }[] }) {
  return (
    <div className="space-y-1 rounded-xl border border-warning/40 bg-warning/5 p-4">
      <p className="text-sm font-medium">
        {slots.length} slot{slots.length > 1 ? "s" : ""} could not produce a verifiable question:
      </p>
      <ul className="list-inside list-disc text-xs text-muted-foreground">
        {slots.map((slot, i) => (
          <li key={i}>
            {slot.citation}: {slot.reason}
          </li>
        ))}
      </ul>
    </div>
  );
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

  const [targetCount, setTargetCount] = useState(8);
  const [formats, setFormats] = useState<QuestionFormat[]>(["mcq_4"]);
  const [customInstructions, setCustomInstructions] = useState("");
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

  function handleGenerate(event: FormEvent) {
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
    setQuestions((prev) => withUpdatedOption(prev, id, index, value));
  }

  function handleSave() {
    if (keptQuestions.length === 0) return;
    save.mutate(toSavePayload(keptQuestions));
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
        <QuizGenerateForm
          hasTemplate={Boolean(template)}
          hasProcessedDocuments={hasProcessedDocuments}
          busy={busy}
          isPending={generate.isPending}
          error={generate.error}
          isError={generate.isError}
          targetCount={targetCount}
          formats={formats}
          customInstructions={customInstructions}
          onTargetCountChange={setTargetCount}
          onToggleFormat={toggleFormat}
          onCustomInstructionsChange={setCustomInstructions}
          onSubmit={handleGenerate}
        />

        {rejectedSlots.length > 0 && <RejectedSlotsNotice slots={rejectedSlots} />}

        {quizQuery.isLoading && <Skeleton className="h-24 w-full" />}

        {!quizQuery.isLoading && !template && (
          <p className="text-sm text-muted-foreground">
            No quiz generated yet. Once documents are processed, generate one above, curate the
            questions, then save to make the pack assignable.
          </p>
        )}

        {template && questions.length > 0 && (
          <QuizQuestionEditor
            questions={questions}
            keptCount={keptQuestions.length}
            droppedIds={droppedIds}
            isPublished={template.isPublished}
            busy={busy}
            regeneratePending={regenerate.isPending}
            savePending={save.isPending}
            regenerateError={regenerate.error}
            regenerateIsError={regenerate.isError}
            saveError={save.error}
            saveIsError={save.isError}
            onUpdateQuestion={updateQuestion}
            onUpdateOption={updateOption}
            onRegenerateDropped={() => regenerate.mutate(droppedIds)}
            onSave={handleSave}
          />
        )}
      </CardContent>
    </Card>
  );
}
