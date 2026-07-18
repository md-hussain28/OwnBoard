"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MemberOnlyGate } from "@/components/onboarding";
import { useOnboardingStore } from "@/stores";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/ui";

export default function UnlockedPage() {
  const setStep = useOnboardingStore((s) => s.setStep);

  useEffect(() => {
    setStep("unlocked");
  }, [setStep]);

  return (
    <MemberOnlyGate>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Repo access unlocked</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Policy and codebase quizzes are complete. Repo access has been granted.
            </p>
            <Button asChild>
              <Link href="/app/chat">Try the archaeology Q&A</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </MemberOnlyGate>
  );
}
