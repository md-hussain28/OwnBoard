"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

export default function UnlockedPage() {
  const setStep = useOnboardingStore((s) => s.setStep);

  useEffect(() => {
    setStep("unlocked");
  }, [setStep]);

  return (
    <div className="max-w-2xl">
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
  );
}
