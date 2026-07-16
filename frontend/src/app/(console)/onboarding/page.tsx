"use client";

import Link from "next/link";
import { useOnboardingStore, type OnboardingStep } from "@/stores/onboarding-store";
import { IncomingBadge } from "@/components/layout/incoming-feature";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { cn } from "@/lib/utils";

const STEPS: { key: OnboardingStep; label: string; href: string }[] = [
  { key: "policy-quiz", label: "Policy quiz", href: "/onboarding/policy-quiz" },
  { key: "codebase-quiz", label: "Codebase quiz", href: "/onboarding/codebase-quiz" },
  { key: "unlocked", label: "Repo access unlocked", href: "/onboarding/unlocked" },
];

export default function OnboardingPage() {
  const { currentStep, policyQuizResult, codebaseQuizResult } = useOnboardingStore();

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Onboarding</h1>
          <IncomingBadge />
        </div>
        <p className="text-muted-foreground">
          Complete the policy quiz, then the codebase quiz, to unlock repo access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned reading packs</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Doc packs assigned by your admin — read every document, then pass the open-book quiz at
            100%.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/onboarding/packs">Open</Link>
          </Button>
        </CardContent>
      </Card>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => {
          const isCurrent = step.key === currentStep;
          const result =
            step.key === "policy-quiz"
              ? policyQuizResult
              : step.key === "codebase-quiz"
                ? codebaseQuizResult
                : "pending";

          return (
            <Card key={step.key} className={cn(isCurrent && "border-foreground/40")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>
                    {index + 1}. {step.label}
                  </span>
                  {result !== "pending" && (
                    <Badge variant={result === "passed" ? "default" : "destructive"}>
                      {result}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" variant={isCurrent ? "default" : "outline"}>
                  <Link href={step.href}>{isCurrent ? "Start" : "Open"}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </ol>
    </div>
  );
}
