"use client";

import { ArrowRightIcon, CheckIcon, GlobeIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDocPack, useDocPackQuiz } from "@/hooks/queries/doc-pack";
import { cn } from "@/lib";
import type { DocPack } from "@/schemas";
import { Badge, Button, Skeleton } from "@/ui";
import { DocPackDocuments } from "./doc-pack-documents";
import { DocPackQuizBuilder } from "./doc-pack-quiz-builder";
import { TrackDetailsForm } from "./track-details-form";

const STEPS = [
  { id: 1, label: "Details", key: "details" },
  { id: 2, label: "Documents", key: "documents" },
  { id: 3, label: "Quiz", key: "quiz" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const PACK_STATUS_BADGE: Record<
  DocPack["status"],
  { variant: "warning" | "success" | "secondary" | "outline"; label: string }
> = {
  needs_review: { variant: "warning", label: "Needs review" },
  active: { variant: "success", label: "Active" },
  draft: { variant: "secondary", label: "Draft" },
  archived: { variant: "outline", label: "Archived" },
};

function AudienceSummary({ pack }: { pack: DocPack }) {
  if (pack.assignToAll) {
    return (
      <Badge variant="outline" className="gap-1">
        <GlobeIcon className="size-3" />
        Everyone
      </Badge>
    );
  }
  if (pack.audienceDomainNames.length > 0) {
    return (
      <Badge variant="outline" className="gap-1">
        <UsersIcon className="size-3" />
        {pack.audienceDomainNames.join(", ")}
      </Badge>
    );
  }
  return <Badge variant="secondary">Manual assign only</Badge>;
}

function PackHeader({ pack, quizPublished }: { pack: DocPack; quizPublished: boolean }) {
  const statusBadge = PACK_STATUS_BADGE[pack.status];

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{pack.name}</h1>
          {pack.domainName && <Badge variant="outline">{pack.domainName}</Badge>}
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
        {pack.description && (
          <p className="text-muted-foreground text-pretty">{pack.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Audience:</span>
          <AudienceSummary pack={pack} />
        </div>
      </div>
      {quizPublished && (
        <Button size="sm" asChild>
          <Link href={`/app/tracks?assign=${pack.id}`}>
            Assign & track
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function stepCircleClass(done: boolean, active: boolean) {
  if (done && !active) return "bg-brand-moss-soft text-brand-moss";
  if (active) return "bg-primary text-primary-foreground";
  return "bg-muted text-muted-foreground";
}

function BuildStep({
  step,
  isLast,
  done,
  active,
  onSelect,
}: {
  step: (typeof STEPS)[number];
  isLast: boolean;
  done: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="flex min-w-0 flex-1 items-center gap-2">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "step" : undefined}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-lg text-left outline-none",
          "transition-opacity hover:opacity-80",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
        )}
      >
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            stepCircleClass(done, active),
          )}
        >
          {done && !active ? <CheckIcon className="size-3.5" /> : step.id}
        </div>
        <span
          className={cn(
            "truncate text-sm",
            active || done ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {step.label}
        </span>
      </button>
      {!isLast && <div className="mx-1 hidden h-px flex-1 bg-border sm:block" aria-hidden />}
    </li>
  );
}

function BuildStepper({
  currentStep,
  hasDocuments,
  hasQuizDraft,
  quizPublished,
  onStepSelect,
}: {
  currentStep: StepId;
  hasDocuments: boolean;
  hasQuizDraft: boolean;
  quizPublished: boolean;
  onStepSelect: (step: StepId) => void;
}) {
  return (
    <ol className="flex items-center gap-2" aria-label="Build progress">
      {STEPS.map((step, index) => {
        const done =
          step.id === 1 ||
          (step.id === 2 && hasDocuments) ||
          (step.id === 3 && (hasQuizDraft || quizPublished));
        const active = step.id === currentStep;
        return (
          <BuildStep
            key={step.key}
            step={step}
            isLast={index === STEPS.length - 1}
            done={done}
            active={active}
            onSelect={() => onStepSelect(step.id)}
          />
        );
      })}
    </ol>
  );
}

function PublishCta({ quizPublished, packId }: { quizPublished: boolean; packId: string }) {
  if (!quizPublished) {
    return (
      <p className="text-sm text-muted-foreground text-pretty">
        Publish the curated quiz above to unlock assigning hires on the Modules desk.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-brand-moss-soft/40 px-4 py-4">
      <p className="text-sm font-medium text-brand-moss">Quiz published</p>
      <p className="mt-1 text-sm text-muted-foreground text-pretty">
        This module is ready to assign. Track who has read and passed from the Modules desk.
      </p>
      <Button className="mt-3" size="sm" asChild>
        <Link href={`/app/tracks?assign=${packId}`}>
          Go to assign & track
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function initialStep(hasDocuments: boolean, hasQuizDraft: boolean, quizPublished: boolean): StepId {
  if (quizPublished || hasQuizDraft || hasDocuments) return 3;
  return 2;
}

export function QuizBuilderFlow({ packId }: { packId: string }) {
  const { data: pack, isLoading, isError } = useDocPack(packId);
  const quizQuery = useDocPackQuiz(packId);

  const hasDocuments = (pack?.documents ?? []).length > 0;
  const hasProcessedDocuments = (pack?.documents ?? []).some((d) => d.status === "processed");
  const quizPublished = Boolean(quizQuery.data?.isPublished);
  const hasQuizDraft = Boolean(quizQuery.data);

  const [currentStep, setCurrentStep] = useState<StepId>(2);
  const hydratedStep = useRef(false);

  // Pick the landing step once pack + quiz data are in — don't jump the user mid-edit later.
  useEffect(() => {
    if (!pack || quizQuery.isLoading || hydratedStep.current) return;
    hydratedStep.current = true;
    setCurrentStep(initialStep(hasDocuments, hasQuizDraft, quizPublished));
  }, [pack, quizQuery.isLoading, hasDocuments, hasQuizDraft, quizPublished]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        {isLoading && <Skeleton className="h-8 w-64" />}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not load this module. Check that you are signed in with an active organization,
            then refresh. If this persists on a deployed site, confirm BACKEND_API_BASE_URL points
            at the live API.
          </p>
        )}

        {pack && <PackHeader pack={pack} quizPublished={quizPublished} />}
      </div>

      {pack && (
        <>
          <BuildStepper
            currentStep={currentStep}
            hasDocuments={hasDocuments}
            hasQuizDraft={hasQuizDraft}
            quizPublished={quizPublished}
            onStepSelect={setCurrentStep}
          />

          {currentStep === 1 && (
            <section className="space-y-2" aria-labelledby="details-step">
              <h2 id="details-step" className="text-sm font-semibold">
                1. Details
              </h2>
              <TrackDetailsForm pack={pack} onSaved={() => setCurrentStep(2)} />
            </section>
          )}

          {currentStep === 2 && (
            <section className="space-y-2" aria-labelledby="documents-step">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="documents-step" className="text-sm font-semibold">
                  2. Documents
                </h2>
                {!hasDocuments && (
                  <span className="text-xs text-muted-foreground">Upload at least one file</span>
                )}
              </div>
              <DocPackDocuments packId={pack.id} packName={pack.name} documents={pack.documents} />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={!hasDocuments}
                  onClick={() => setCurrentStep(3)}
                >
                  Continue to quiz
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section className="space-y-2" aria-labelledby="quiz-step">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="quiz-step" className="text-sm font-semibold">
                  3. Quiz
                </h2>
                {!hasProcessedDocuments && (
                  <span className="text-xs text-muted-foreground">
                    Wait until documents finish processing
                  </span>
                )}
              </div>
              <DocPackQuizBuilder packId={pack.id} hasProcessedDocuments={hasProcessedDocuments} />
              <PublishCta quizPublished={quizPublished} packId={pack.id} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
