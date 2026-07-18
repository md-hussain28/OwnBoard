"use client";

import { AccessGateSection } from "@/components/onboarding/access-gate-section";
import { MemberOnlyGate } from "@/components/onboarding/member-only-gate";
import { ReadingTracksSection } from "@/components/onboarding/reading-tracks-section";

export default function OnboardingPage() {
  return (
    <MemberOnlyGate>
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Your onboarding</h1>
          <p className="max-w-prose text-pretty text-muted-foreground">
            Everything your admin assigned, in the order to work through it. Finish your reading
            modules and gate quizzes to unlock repo access.
          </p>
        </header>

        <ReadingTracksSection />

        <AccessGateSection />
      </div>
    </MemberOnlyGate>
  );
}
