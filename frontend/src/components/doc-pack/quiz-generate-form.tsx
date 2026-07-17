"use client";

import { CheckIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import type { FormEvent } from "react";
import type { QuestionFormat } from "@/components/doc-pack/quiz-builder-types";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";

type QuizGenerateFormProps = {
  hasTemplate: boolean;
  hasProcessedDocuments: boolean;
  busy: boolean;
  isPending: boolean;
  targetCount: number;
  formats: QuestionFormat[];
  customInstructions: string;
  onTargetCountChange: (value: number) => void;
  onToggleFormat: (format: QuestionFormat) => void;
  onCustomInstructionsChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function QuizGenerateForm({
  hasTemplate,
  hasProcessedDocuments,
  busy,
  isPending,
  targetCount,
  formats,
  customInstructions,
  onTargetCountChange,
  onToggleFormat,
  onCustomInstructionsChange,
  onSubmit,
}: QuizGenerateFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border p-4">
      <p className="text-sm font-medium">
        {hasTemplate ? "Regenerate the quiz" : "Generate a quiz from this pack"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Questions
          <Input
            type="number"
            min={5}
            max={15}
            value={targetCount}
            onChange={(e) => onTargetCountChange(Number(e.target.value))}
            className="w-20"
          />
        </label>
        {(["mcq_4", "true_false"] as const).map((format) => (
          <Button
            key={format}
            type="button"
            size="sm"
            variant={formats.includes(format) ? "default" : "outline"}
            onClick={() => onToggleFormat(format)}
          >
            {formats.includes(format) && <CheckIcon className="size-3.5" />}
            {format === "mcq_4" ? "4-option MCQ" : "True / False"}
          </Button>
        ))}
      </div>
      <Textarea
        placeholder="Optional instructions for the generator (tone, focus areas, ...)"
        value={customInstructions}
        onChange={(e) => onCustomInstructionsChange(e.target.value)}
      />
      <Button type="submit" disabled={busy || !hasProcessedDocuments || formats.length === 0}>
        {isPending ? (
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
    </form>
  );
}
