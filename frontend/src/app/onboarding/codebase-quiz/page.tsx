"use client";

import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { QuizQuestionCard } from "@/components/onboarding/quiz-question-card";
import { Button } from "@/ui/button";

const MOCK_QUESTION = {
  prompt:
    "The `syncRetryQueue` job retries failed webhook deliveries with exponential backoff. Per a senior engineer's note, what's the max backoff cap?",
  options: ["30 seconds", "5 minutes", "1 hour"],
  citation: "src/jobs/sync-retry-queue.ts (commit a1b2c3d)",
};

export default function CodebaseQuizPage() {
  const router = useRouter();
  const setCodebaseQuizResult = useOnboardingStore((s) => s.setCodebaseQuizResult);
  const setStep = useOnboardingStore((s) => s.setStep);

  function handleContinue() {
    setCodebaseQuizResult("passed");
    setStep("unlocked");
    router.push("/onboarding/unlocked");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Codebase quiz</h1>
        <p className="text-muted-foreground">
          Grounded in retrieved code and git history, including a senior engineer&apos;s custom
          instruction.
        </p>
      </div>
      <QuizQuestionCard {...MOCK_QUESTION} />
      <Button onClick={handleContinue}>Continue</Button>
    </div>
  );
}
