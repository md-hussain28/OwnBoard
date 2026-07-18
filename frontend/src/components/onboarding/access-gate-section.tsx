"use client";

import {
  BookOpenCheckIcon,
  CheckCircle2Icon,
  CircleIcon,
  Code2Icon,
  LockIcon,
  UnlockIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { IncomingBadge } from "@/components/layout/incoming-feature";
import { cn } from "@/lib/utils";
import {
  type OnboardingStep,
  type StepResult,
  useOnboardingStore,
} from "@/stores/onboarding-store";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";

type QuizAssignment = {
  key: Exclude<OnboardingStep, "unlocked">;
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const QUIZ_ASSIGNMENTS: QuizAssignment[] = [
  {
    key: "policy-quiz",
    label: "Policy quiz",
    description: "Open-book check on company policy. Pass this before the codebase quiz.",
    href: "/app/onboarding/policy-quiz",
    icon: <BookOpenCheckIcon className="size-4" />,
  },
  {
    key: "codebase-quiz",
    label: "Codebase quiz",
    description: "Scenario questions grounded in your team's real git history.",
    href: "/app/onboarding/codebase-quiz",
    icon: <Code2Icon className="size-4" />,
  },
];

function resultLabel(result: StepResult, isCurrent: boolean): string {
  if (result === "passed") return "Passed";
  if (result === "failed") return "Failed — retry";
  if (isCurrent) return "Up next";
  return "Not started";
}

function resultVariant(
  result: StepResult,
  isCurrent: boolean,
): "success" | "destructive" | "default" | "secondary" {
  if (result === "passed") return "success";
  if (result === "failed") return "destructive";
  if (isCurrent) return "default";
  return "secondary";
}

function ctaLabel(result: StepResult, isCurrent: boolean): string {
  if (result === "passed") return "Review";
  if (result === "failed") return "Retry";
  if (isCurrent) return "Start quiz";
  return "Open";
}

function StepMarker({
  isPassed,
  isCurrent,
  icon,
}: {
  isPassed: boolean;
  isCurrent: boolean;
  icon: ReactNode;
}) {
  if (isPassed) return <CheckCircle2Icon className="size-4" />;
  if (isCurrent) return icon;
  return <CircleIcon className="size-3.5" />;
}

function QuizAssignmentRow({
  quiz,
  index,
  result,
  isCurrent,
  showConnector,
}: {
  quiz: QuizAssignment;
  index: number;
  result: StepResult;
  isCurrent: boolean;
  showConnector: boolean;
}) {
  const isPassed = result === "passed";

  return (
    <li
      className={cn(
        "relative flex gap-4 p-4 transition-colors",
        isCurrent && "bg-primary/5",
        showConnector && "border-b",
      )}
    >
      <div className="flex flex-col items-center pt-0.5" aria-hidden>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            isPassed && "bg-success/15 text-success",
            isCurrent && !isPassed && "bg-primary text-primary-foreground",
            !isCurrent && !isPassed && "bg-muted text-muted-foreground",
          )}
        >
          <StepMarker isPassed={isPassed} isCurrent={isCurrent} icon={quiz.icon} />
        </span>
        {showConnector && (
          <span
            className={cn("mt-2 min-h-4 w-px flex-1", isPassed ? "bg-success/40" : "bg-border")}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              Quiz {index + 1}
            </span>
            <Badge variant={resultVariant(result, isCurrent)}>
              {resultLabel(result, isCurrent)}
            </Badge>
          </div>
          <p className="font-medium text-foreground">{quiz.label}</p>
          <p className="text-pretty text-sm text-muted-foreground">{quiz.description}</p>
        </div>
        <Button
          asChild
          size="sm"
          variant={isCurrent && !isPassed ? "default" : "outline"}
          className="shrink-0 self-start sm:self-center"
        >
          <Link href={quiz.href}>{ctaLabel(result, isCurrent)}</Link>
        </Button>
      </div>
    </li>
  );
}

function UnlockCallout({ unlocked }: { unlocked: boolean }) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        unlocked ? "border-success/30 bg-success/5" : "border-dashed bg-muted/30",
      )}
      aria-labelledby="unlock-heading"
    >
      <div className="flex gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            unlocked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {unlocked ? <UnlockIcon className="size-4" /> : <LockIcon className="size-4" />}
        </span>
        <div className="space-y-1">
          <h2 id="unlock-heading" className="font-medium text-foreground">
            {unlocked ? "Repo access unlocked" : "Repo access locked"}
          </h2>
          <p className="text-pretty text-sm text-muted-foreground">
            {unlocked
              ? "Both gate quizzes are complete. You can use the archaeology Q&A and related tools."
              : "Pass the policy quiz, then the codebase quiz, to unlock access."}
          </p>
        </div>
      </div>
      {unlocked ? (
        <Button asChild size="sm" className="shrink-0 self-start sm:self-center">
          <Link href="/app/onboarding/unlocked">Open</Link>
        </Button>
      ) : (
        <Badge variant="secondary" className="shrink-0 self-start sm:self-center">
          After quizzes
        </Badge>
      )}
    </section>
  );
}

export function AccessGateSection() {
  const { currentStep, policyQuizResult, codebaseQuizResult } = useOnboardingStore();
  const results: Record<Exclude<OnboardingStep, "unlocked">, StepResult> = {
    "policy-quiz": policyQuizResult,
    "codebase-quiz": codebaseQuizResult,
  };

  const quizzesPassed =
    (policyQuizResult === "passed" ? 1 : 0) + (codebaseQuizResult === "passed" ? 1 : 0);
  const unlocked = currentStep === "unlocked" && quizzesPassed === 2;

  return (
    <>
      <section className="space-y-3" aria-labelledby="gate-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="gate-heading" className="text-sm font-medium text-muted-foreground">
            Access gate — complete in order
          </h2>
          <IncomingBadge />
        </div>

        <ol className="overflow-hidden rounded-xl border bg-card shadow-soft">
          {QUIZ_ASSIGNMENTS.map((quiz, index) => (
            <QuizAssignmentRow
              key={quiz.key}
              quiz={quiz}
              index={index}
              result={results[quiz.key]}
              isCurrent={quiz.key === currentStep}
              showConnector={index < QUIZ_ASSIGNMENTS.length - 1}
            />
          ))}
        </ol>
      </section>

      <UnlockCallout unlocked={unlocked} />
    </>
  );
}
