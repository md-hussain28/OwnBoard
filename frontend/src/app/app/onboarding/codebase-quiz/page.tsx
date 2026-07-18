"use client";

import { useRouter } from "next/navigation";
import { IncomingFeature } from "@/components/layout";
import { MemberOnlyGate, QuizQuestionCard } from "@/components/onboarding";
import { useOnboardingStore } from "@/stores";
import { Button } from "@/ui";

const MOCK_QUESTION = {
  questionText:
    "The `syncRetryQueue` job retries failed webhook deliveries with exponential backoff. Per a senior engineer's note, what's the max backoff cap?",
  options: ["30 seconds", "5 minutes", "1 hour"],
  sourceCitation: "src/jobs/sync-retry-queue.ts (commit a1b2c3d)",
};

export default function CodebaseQuizPage() {
  const router = useRouter();
  const setCodebaseQuizResult = useOnboardingStore((s) => s.setCodebaseQuizResult);
  const setStep = useOnboardingStore((s) => s.setStep);

  function handleContinue() {
    setCodebaseQuizResult("passed");
    setStep("unlocked");
    router.push("/app/onboarding/unlocked");
  }

  return (
    <MemberOnlyGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Codebase quiz</h1>
          <p className="text-muted-foreground">
            Grounded in retrieved code and git history, including a senior engineer&apos;s custom
            instruction.
          </p>
        </div>
        <IncomingFeature description="Codebase quizzes grounded in your repo's real git history are still being built — this is a sample question, and answering it won't be graded." />
        <QuizQuestionCard {...MOCK_QUESTION} />
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </MemberOnlyGate>
  );
}
