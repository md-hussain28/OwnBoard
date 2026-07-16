"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight, BookCheck, GitBranch, Users } from "lucide-react";
import { ConnectedReposList } from "@/components/repo/connected-repos-list";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

const FEATURES = [
  {
    icon: BookCheck,
    title: "Policy quizzes",
    body: "Scenario checks grounded in your docs — not handbook-and-hope.",
    well: "bg-brand-honey-soft text-brand-honey",
  },
  {
    icon: GitBranch,
    title: "Commit-grounded readiness",
    body: "Codebase quizzes cite real git history so answers stay verifiable.",
    well: "bg-brand-teal-soft text-brand-teal",
  },
  {
    icon: Users,
    title: "Expert routing",
    body: "Low confidence escalates to a human with a drafted introduction.",
    well: "bg-brand-moss-soft text-brand-moss",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <Show when="signed-out">
        <div className="space-y-16 pb-8">
          <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-6">
              <p className="text-sm font-semibold text-primary">OwnBoard</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Onboarding you can verify
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Cited quizzes, commit-grounded readiness checks, and archaeology Q&A
                that escalate to a human when confidence is low.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SignUpButton mode="modal">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get started
                    <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Sign in
                  </Button>
                </SignInButton>
              </div>
            </div>

            <div className="relative hidden perspective-[2000px] lg:block">
              <Card className="rotate-y-[-8deg] rotate-x-[4deg] border-border p-6 shadow-card-hover transition-transform duration-500 hover:rotate-y-[-4deg] hover:rotate-x-[2deg]">
                <CardContent className="space-y-4 p-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-honey-soft text-brand-honey">
                    <GitBranch className="size-6" strokeWidth={2} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Evidence first</h2>
                  <p className="leading-relaxed text-muted-foreground">
                    Every claim links back to a citation, commit, or file — so new
                    hires and mentors share the same ground truth.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-semibold text-brand-teal">
                      Cited
                    </span>
                    <span className="rounded-full bg-brand-honey-soft px-3 py-1 text-xs font-semibold text-brand-amber">
                      Escalates
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="hover:-translate-y-1 hover:shadow-card-hover"
              >
                <CardContent className="space-y-3 pt-1">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.well}`}
                  >
                    <feature.icon className="size-5" strokeWidth={2} />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">
                    {feature.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="space-y-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
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
