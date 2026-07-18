"use client";

import { AccessGateSection, MemberOnlyGate, ReadingTracksSection } from "@/components/onboarding";

export default function OnboardingPage() {
  return (
    <MemberOnlyGate>
      <div className="space-y-8">
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
