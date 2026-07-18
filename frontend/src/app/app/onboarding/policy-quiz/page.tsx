"use client";

import { useRouter } from "next/navigation";
import { IncomingFeature } from "@/components/layout";
import { MemberOnlyGate, QuizQuestionCard } from "@/components/onboarding";
import { useOnboardingStore } from "@/stores";
import { Button } from "@/ui";

const MOCK_QUESTION = {
  questionText:
    "A teammate asks you to push a hotfix directly to main to save time before a demo. What do you do?",
  options: [
    "Push directly, the demo is more important",
    "Open a PR and request at least one review, even for hotfixes",
    "Ask a manager to push it for you",
  ],
  sourceCitation: "docs/engineering-policy.md#code-review",
};

export default function PolicyQuizPage() {
  const router = useRouter();
  const setPolicyQuizResult = useOnboardingStore((s) => s.setPolicyQuizResult);
  const setStep = useOnboardingStore((s) => s.setStep);

  function handleContinue() {
    setPolicyQuizResult("passed");
    setStep("codebase-quiz");
    router.push("/app/onboarding/codebase-quiz");
  }

  return (
    <MemberOnlyGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Policy quiz</h1>
          <p className="text-muted-foreground">
            Scenario-based question, backed by a citation to the policy source.
          </p>
        </div>
        <IncomingFeature description="AI-generated policy quizzes are still being built — this is a sample question, and answering it won't be graded." />
        <QuizQuestionCard {...MOCK_QUESTION} />
        <Button onClick={handleContinue}>Continue</Button>
      </div>
    </MemberOnlyGate>
  );
}
