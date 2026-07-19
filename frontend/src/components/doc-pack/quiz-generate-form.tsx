"use client";

import { CheckIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import type { FormEvent } from "react";
import { LoadingPun } from "@/components/shared";
import { Button, Input, Textarea } from "@/ui";
import { FORMAT_LABEL, type GenerateFormat } from "./quiz-builder-types";

const GENERATE_FORMATS: GenerateFormat[] = ["mcq_4", "true_false"];

type QuizGenerateFormProps = {
  hasTemplate: boolean;
  hasProcessedDocuments: boolean;
  busy: boolean;
  isPending: boolean;
  targetCount: number;
  formats: GenerateFormat[];
  customInstructions: string;
  onTargetCountChange: (value: number) => void;
  onToggleFormat: (format: GenerateFormat) => void;
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

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Questions</span>
          <Input
            type="number"
            min={5}
            max={15}
            value={targetCount}
            onChange={(e) => onTargetCountChange(Number(e.target.value))}
            className="w-20"
          />
        </label>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Formats</p>
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Question formats"
          >
            {GENERATE_FORMATS.map((format) => {
              const selected = formats.includes(format);
              return (
                <Button
                  key={format}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  onClick={() => onToggleFormat(format)}
                >
                  {selected && <CheckIcon className="size-3.5" />}
                  {FORMAT_LABEL[format]}
                </Button>
              );
            })}
          </div>
        </div>
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
      {isPending && (
        <LoadingPun className="justify-start rounded-lg bg-brand-mist/60 px-3 py-2 text-xs" />
      )}
      {!hasProcessedDocuments && (
        <p className="text-xs text-muted-foreground">
          Upload at least one document and wait for processing to finish first.
        </p>
      )}
      {formats.length === 0 && (
        <p className="text-xs text-warning">Pick at least one format to generate.</p>
      )}
    </form>
  );
}
