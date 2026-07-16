"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ConnectedReposList } from "@/components/repo/connected-repos-list";
import { Button } from "@/ui/button";

export default function HomePage() {
  return (
    <>
      <Show when="signed-out">
        <div className="space-y-8">
          <section className="space-y-3">
            <h1 className="text-3xl font-semibold">Onboard</h1>
            <p className="max-w-2xl text-muted-foreground">
              Cited, commit-grounded engineering onboarding — policy quizzes, codebase
              readiness checks, and archaeology Q&A that escalate to a human when
              confidence is low.
            </p>
          </section>
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" variant="outline">
                Sign up
              </Button>
            </SignUpButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="space-y-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold">Overview</h1>
            <p className="text-muted-foreground">
              Connect repositories to ground quizzes, archaeology answers, and skill-graph
              risk in real git history.
            </p>
          </section>
          <ConnectedReposList />
        </div>
      </Show>
    </>
  );
}
