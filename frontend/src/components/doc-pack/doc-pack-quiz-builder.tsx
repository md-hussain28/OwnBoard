"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  useDocPack,
  useDocPackQuiz,
  useGenerateQuiz,
  useRegenerateQuestions,
  useSaveQuiz,
} from "@/hooks/queries/doc-pack";
import { ID_PREFIXES, notify, randomPun, typedId } from "@/lib";
import type { AdminQuizTemplate, QuizQuestionCurationItem } from "@/schemas";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Skeleton } from "@/ui";
import type { EditableQuestion, GenerateFormat } from "./quiz-builder-types";
import { QuizGenerateForm } from "./quiz-generate-form";
import { QuizQuestionEditor } from "./quiz-question-editor";

function toEditable(template: AdminQuizTemplate): EditableQuestion[] {
  return template.questions.map((q) => {
    const isMulti = q.format === "multi_select";
    return {
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      format: q.format,
      correctAnswer: !isMulti && typeof q.correctAnswer === "string" ? q.correctAnswer : "",
      correctAnswers: isMulti && Array.isArray(q.correctAnswer) ? q.correctAnswer : [],
      sourceCitation: q.sourceCitation,
      dropped: false,
    };
  });
}

function newBlankQuestion(): EditableQuestion {
  return {
    id: typedId(ID_PREFIXES.draft),
    questionText: "",
    options: ["", "", "", ""],
    format: "mcq_4",
    correctAnswer: "",
    correctAnswers: [],
    sourceCitation: null,
    dropped: false,
    isNew: true,
  };
}

function withUpdatedOption(
  questions: EditableQuestion[],
  id: string,
  index: number,
  value: string,
): EditableQuestion[] {
  return questions.map((q) => {
    if (q.id !== id) return q;
    const previous = q.options[index];
    const options = q.options.map((o, i) => (i === index ? value : o));
    return {
      ...q,
      options,
      correctAnswer: q.correctAnswer === previous ? value : q.correctAnswer,
      correctAnswers: q.correctAnswers.map((c) => (c === previous ? value : c)),
    };
  });
}

/** True once a kept question is complete enough to publish (Track PRD §authoring). */
function isComplete(q: EditableQuestion): boolean {
  if (!q.questionText.trim()) return false;
  const options = q.options.map((o) => o.trim());
  if (options.length < 2 || options.some((o) => !o)) return false;
  if (q.format === "multi_select") {
    return q.correctAnswers.length > 0 && q.correctAnswers.every((c) => options.includes(c.trim()));
  }
  return Boolean(q.correctAnswer.trim()) && options.includes(q.correctAnswer.trim());
}

function toSavePayload(questions: EditableQuestion[]): QuizQuestionCurationItem[] {
  return questions.map((q) => ({
    id: q.id,
    question_text: q.questionText.trim(),
    options: q.options.map((o) => o.trim()),
    correct_answer: q.format === "multi_select" ? q.correctAnswers : q.correctAnswer.trim(),
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
  const packQuery = useDocPack(packId);
  const generate = useGenerateQuiz(packId);
  const regenerate = useRegenerateQuestions(packId);
  const save = useSaveQuiz(packId);

  const [targetCount, setTargetCount] = useState(8);
  const [formats, setFormats] = useState<GenerateFormat[]>(["mcq_4"]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [openBook, setOpenBook] = useState(false);
  const [passPct, setPassPct] = useState(100);

  const template = quizQuery.data;
  useEffect(() => {
    if (template) {
      setQuestions(toEditable(template));
      setOpenBook(template.openBook);
    }
  }, [template]);

  const savedPassPct = packQuery.data?.passPct;
  useEffect(() => {
    if (savedPassPct != null) setPassPct(savedPassPct);
  }, [savedPassPct]);

  const rejectedSlots = generate.data?.rejectedSlots ?? [];
  const droppedIds = useMemo(
    () => questions.filter((q) => q.dropped).map((q) => q.id),
    [questions],
  );
  const keptQuestions = questions.filter((q) => !q.dropped);
  const incompleteCount = keptQuestions.filter((q) => !isComplete(q)).length;
  const canSave = keptQuestions.length > 0 && incompleteCount === 0;

  function toggleFormat(format: GenerateFormat) {
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );
  }

  function handleGenerate(event: FormEvent) {
    event.preventDefault();
    if (formats.length === 0) return;
    // A little free-tier levity while the 0.1-CPU backend does the heavy lifting.
    notify.info("Generating your quiz…", {
      description: randomPun(),
      id: `quiz-gen-start:${packId}`,
    });
    generate.mutate(
      {
        target_count: targetCount,
        formats,
        custom_instructions: customInstructions.trim() || undefined,
      },
      {
        onSuccess: () => {
          notify.success("Quiz generated", {
            description: "Review the questions, then save to publish.",
            id: `quiz-gen:${packId}`,
          });
        },
        onError: (err) => {
          notify.apiError(err, "Generation failed", { id: `quiz-gen-error:${packId}` });
        },
      },
    );
  }

  function updateQuestion(id: string, patch: Partial<EditableQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function updateOption(id: string, index: number, value: string) {
    setQuestions((prev) => withUpdatedOption(prev, id, index, value));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, newBlankQuestion()]);
  }

  function addOption(id: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, options: [...q.options, ""] } : q)),
    );
  }

  function removeOption(id: string, index: number) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const removed = q.options[index];
        return {
          ...q,
          options: q.options.filter((_, i) => i !== index),
          correctAnswer: q.correctAnswer === removed ? "" : q.correctAnswer,
          correctAnswers: q.correctAnswers.filter((c) => c !== removed),
        };
      }),
    );
  }

  function setCorrect(id: string, option: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        if (q.format === "multi_select") {
          const has = q.correctAnswers.includes(option);
          return {
            ...q,
            correctAnswers: has
              ? q.correctAnswers.filter((c) => c !== option)
              : [...q.correctAnswers, option],
          };
        }
        return { ...q, correctAnswer: option };
      }),
    );
  }

  function handleSave() {
    if (!canSave) return;
    const clampedPassPct = Math.min(100, Math.max(1, Math.round(passPct)));
    save.mutate(
      { questions: toSavePayload(keptQuestions), openBook, passPct: clampedPassPct },
      {
        onSuccess: () => {
          notify.success("Quiz saved", {
            description: `Employees need ${clampedPassPct}% to pass. ${
              openBook
                ? "Reading stays available during the quiz."
                : "Reading is hidden once the quiz starts."
            }`,
            id: `quiz-save:${packId}`,
          });
        },
        onError: (err) => {
          notify.apiError(err, "Save failed", { id: `quiz-save-error:${packId}` });
        },
      },
    );
  }

  function handleRegenerateDropped() {
    // Only AI-generated (server-backed) questions can be regenerated; skip hand-authored ones.
    const regenerableIds = questions.filter((q) => q.dropped && !q.isNew).map((q) => q.id);
    if (regenerableIds.length === 0) return;
    regenerate.mutate(regenerableIds, {
      onSuccess: () => {
        notify.success("Questions regenerated", { id: `quiz-regen:${packId}` });
      },
      onError: (err) => {
        notify.apiError(err, "Regeneration failed", { id: `quiz-regen-error:${packId}` });
      },
    });
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
            questions, then save to make the module assignable.
          </p>
        )}

        {template && (
          <div className="space-y-2" aria-labelledby="pass-mark-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 id="pass-mark-heading" className="text-sm font-medium">
                  Pass mark (%)
                </h3>
                <p className="text-xs text-muted-foreground text-pretty">
                  Employees need {Math.min(100, Math.max(1, Math.round(passPct)))}% to pass this
                  quiz.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  aria-label="Pass mark percent"
                  value={Number.isNaN(passPct) ? "" : passPct}
                  onChange={(e) => setPassPct(Number.parseInt(e.target.value, 10))}
                  className="w-20 text-right tabular-nums"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        )}

        {template && (
          <QuizQuestionEditor
            questions={questions}
            keptCount={keptQuestions.length}
            droppedIds={droppedIds}
            incompleteCount={incompleteCount}
            canSave={canSave}
            isPublished={template.isPublished}
            openBook={openBook}
            onOpenBookChange={setOpenBook}
            busy={busy}
            regeneratePending={regenerate.isPending}
            savePending={save.isPending}
            onUpdateQuestion={updateQuestion}
            onUpdateOption={updateOption}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onSetCorrect={setCorrect}
            onAddQuestion={addQuestion}
            onRegenerateDropped={handleRegenerateDropped}
            onSave={handleSave}
          />
        )}
      </CardContent>
    </Card>
  );
}
