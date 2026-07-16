"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateDocPack } from "@/hooks/queries/doc-pack/doc-pack.mutations";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/errors";

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Documents" },
  { id: 3, label: "Quiz" },
] as const;

export function QuizCreateFlow() {
  const router = useRouter();
  const createPack = useCreateDocPack();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createPack.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (pack) => {
          router.push(`/doc-packs/${pack.id}`);
        },
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Create a quiz</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Name the pack, upload the reading, then generate and publish a cited quiz — all in one
          flow.
        </p>
      </div>

      <ol className="flex items-center gap-2" aria-label="Create progress">
        {STEPS.map((step, index) => {
          const active = step.id === 1;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {step.id}
              </div>
              <span
                className={cn(
                  "truncate text-sm",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <div className="mx-1 hidden h-px flex-1 bg-border sm:block" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-border bg-background p-5 shadow-soft sm:p-6"
      >
        <div className="space-y-2">
          <label htmlFor="quiz-name" className="text-sm font-medium">
            Quiz name
          </label>
          <Input
            id="quiz-name"
            placeholder="e.g. Security Onboarding"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="quiz-description" className="text-sm font-medium">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id="quiz-description"
            placeholder="What should hires learn from this pack?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {createPack.isError && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(createPack.error, "Could not create quiz.")}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Next: upload documents, then generate the quiz.
          </p>
          <Button type="submit" disabled={createPack.isPending || !name.trim()}>
            {createPack.isPending ? "Creating…" : "Continue to documents"}
          </Button>
        </div>
      </form>
    </div>
  );
}
