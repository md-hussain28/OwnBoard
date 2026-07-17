"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, Check, GitCommitHorizontal } from "lucide-react";
import Link from "next/link";
import { APP_HOME } from "@/lib/routes";
import { Button } from "@/ui/button";

function EvidencePanel() {
  return (
    <div
      className="landing-panel relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
      aria-hidden
    >
      <div className="absolute -inset-3 rounded-[1.75rem] bg-brand-gradient opacity-[0.12] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.35rem] border border-border/80 bg-card shadow-card-hover">
        <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
          <span className="size-2.5 rounded-full bg-brand-coral/80" />
          <span className="size-2.5 rounded-full bg-brand-honey/80" />
          <span className="size-2.5 rounded-full bg-brand-moss/80" />
          <span className="ml-2 font-mono text-[0.6875rem] text-muted-foreground">
            readiness · payments-service
          </span>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-[0.6875rem] font-medium text-muted-foreground">Scenario</p>
            <p className="text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground">
              A retry lands on a partially committed ledger write. What should the worker do?
            </p>
          </div>

          <div className="space-y-3 rounded-xl bg-muted/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-relaxed text-foreground">
                Idempotency key already exists — short-circuit and return the stored receipt. Do not
                re-apply the side effect.
              </p>
              <span className="landing-cite-pulse shrink-0 rounded-md bg-brand-teal-soft px-2 py-1 text-[0.6875rem] font-semibold text-brand-teal">
                Cited
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-1 font-mono text-[0.6875rem] text-muted-foreground">
                <GitCommitHorizontal className="size-3 text-brand-teal" />
                a3f91c2 · ledger.ts
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-1 font-mono text-[0.6875rem] text-muted-foreground">
                PR #482 · “retry-safe writes”
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-6 items-center justify-center rounded-md bg-brand-moss-soft text-brand-moss">
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
              Grounded · confidence 0.91
            </div>
            <span className="text-[0.6875rem] font-medium text-brand-amber">
              Below 0.6 → human route
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const showAppCta = isLoaded && isSignedIn;

  return (
    <div className="pb-16">
      {/* Hero — one composition: brand, headline, sentence, CTAs, evidence panel */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_oklch,var(--brand-honey)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_40%,color-mix(in_oklch,var(--brand-teal)_10%,transparent),transparent_50%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pb-24 lg:pt-16">
          <div className="space-y-7">
            <p
              className="landing-rise text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
              style={{ animationDelay: "0ms" }}
            >
              OwnBoard
            </p>
            <h1
              className="landing-rise max-w-[14ch] text-[clamp(2.35rem,5.5vw,3.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground"
              style={{ animationDelay: "80ms" }}
            >
              Onboarding you can verify
            </h1>
            <p
              className="landing-rise max-w-[42ch] text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              Cited policy quizzes, commit-grounded readiness checks, and expert routing that
              escalates instead of guessing.
            </p>
            <div
              className="landing-rise flex flex-col gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: "240ms" }}
            >
              {showAppCta ? (
                <Button size="lg" className="w-full active:scale-[0.96] sm:w-auto" asChild>
                  <Link href={APP_HOME}>
                    Open app
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <SignUpButton mode="modal" forceRedirectUrl={APP_HOME}>
                    <Button size="lg" className="w-full active:scale-[0.96] sm:w-auto">
                      Get started
                      <ArrowRight className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5" />
                    </Button>
                  </SignUpButton>
                  <SignInButton mode="modal" forceRedirectUrl={APP_HOME}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full active:scale-[0.96] sm:w-auto"
                    >
                      Sign in
                    </Button>
                  </SignInButton>
                </>
              )}
            </div>
          </div>

          <EvidencePanel />
        </div>
      </section>

      {/* Problem — handbook hope vs evidence */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            <h2 className="max-w-[16ch] text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-tight text-foreground">
              Handbook-and-hope doesn&apos;t gate production
            </h2>
            <p className="max-w-[48ch] text-base leading-relaxed text-muted-foreground">
              Policy gets skimmed. Codebase context stays tribal. Bus-factor risk hides until
              someone leaves — and new hires start shipping before anyone verified they understand
              why the system is built this way.
            </p>
          </div>
          <div className="flex flex-col justify-end space-y-5 border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
              OwnBoard turns onboarding into evidence.
            </p>
            <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-honey" />
                Scenario quizzes grounded in your docs and git history — with citations.
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-teal" />
                Skill graphs computed from commits, not self-reported surveys.
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-moss" />
                Low confidence hands off to a human with a drafted introduction.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Flow — real sequence, not icon cards */}
      <section className="border-y border-border/60 bg-muted/35">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <h2 className="mb-14 max-w-[18ch] text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-tight text-foreground">
            From docs and git history to verified access
          </h2>

          <ol className="grid gap-0 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Ground the corpus",
                body: "Connect policy packs and repositories. Quizzes and answers retrieve from real sources — not a chat window’s best guess.",
              },
              {
                step: "02",
                title: "Verify readiness",
                body: "New hires take scenario checks cited to paragraphs and commits. Mentors can inject priorities before access unlocks.",
              },
              {
                step: "03",
                title: "Route when stuck",
                body: "Archaeology Q&A escalates below confidence. The system drafts an intro to the person whose git history actually owns the answer.",
              },
            ].map((item, index) => (
              <li
                key={item.step}
                className={`relative space-y-3 py-6 md:px-6 md:py-0 ${
                  index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""
                } ${index === 0 ? "md:pl-0" : ""} ${index === 2 ? "md:pr-0" : ""}`}
              >
                <span className="font-mono text-sm font-medium text-brand-honey">{item.step}</span>
                <h3 className="text-lg font-bold tracking-tight text-foreground">{item.title}</h3>
                <p className="max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Capabilities — asymmetric, not identical cards */}
      <section className="mx-auto max-w-6xl space-y-24 px-6 py-20 lg:space-y-32 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="space-y-4">
            <h2 className="max-w-[16ch] text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-tight">
              Quizzes that cite their sources
            </h2>
            <p className="max-w-[48ch] text-base leading-relaxed text-muted-foreground">
              Policy scenarios pull from your handbook. Codebase readiness pulls from blame, log,
              and numstat. Every answer can open the paragraph or commit that grounds it — so
              mentors and new hires share one ground truth.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/80 bg-card p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold tracking-tight">Access gate</span>
              <span className="rounded-md bg-brand-moss-soft px-2 py-1 text-[0.6875rem] font-semibold text-brand-moss">
                Unlocked
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                <span className="text-foreground">Policy comprehension</span>
                <span className="font-mono text-brand-moss tabular-nums">92%</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                <span className="text-foreground">Codebase readiness</span>
                <span className="font-mono text-brand-moss tabular-nums">88%</span>
              </div>
              <p className="pt-1 text-[0.75rem] leading-relaxed text-muted-foreground">
                Repo write access stays gated until both checks pass — simulated unlock in-app for
                the demo path.
              </p>
            </div>
          </div>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="order-2 space-y-4 rounded-[1.25rem] border border-border/80 bg-card p-5 shadow-soft sm:p-6 lg:order-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight">Bus-factor · auth</span>
              <span className="rounded-md bg-brand-coral-soft px-2 py-1 text-[0.6875rem] font-semibold text-brand-coral">
                High risk
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: "maya@", share: "78%", width: "78%" },
                { name: "jon@", share: "14%", width: "14%" },
                { name: "others", share: "8%", width: "8%" },
              ].map((row) => (
                <div key={row.name} className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[0.6875rem] text-muted-foreground">
                    <span>{row.name}</span>
                    <span className="tabular-nums">{row.share}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-coral"
                      style={{ width: row.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="pt-2 text-[0.75rem] leading-relaxed text-muted-foreground">
              Inferred from git history — not a survey checkbox.
            </p>
          </div>
          <div className="order-1 space-y-4 lg:order-2">
            <h2 className="max-w-[16ch] text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-tight">
              See who actually knows what
            </h2>
            <p className="max-w-[48ch] text-base leading-relaxed text-muted-foreground">
              Engineering managers get a calm view of single points of failure. Expertise is
              computed from real ownership signals, so routing and risk stay honest.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            <h2 className="max-w-[18ch] text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-tight">
              When confidence is low, ask a human
            </h2>
            <p className="max-w-[48ch] text-base leading-relaxed text-muted-foreground">
              OwnBoard does not bluff. Below the threshold it drafts an introduction to the right
              expert — with the question, citations, and why that person was chosen.
            </p>
          </div>
          <blockquote className="rounded-[1.25rem] border border-border/80 bg-brand-teal-soft/40 p-6 sm:p-8">
            <p className="text-base font-medium leading-relaxed tracking-tight text-foreground">
              “Hi Maya — I’m stuck on the ledger retry path in payments-service. OwnBoard cited
              a3f91c2 and PR #482 but confidence is 0.42. Could you walk me through the idempotency
              contract?”
            </p>
            <footer className="mt-5 font-mono text-[0.6875rem] text-brand-teal">
              Drafted intro · evidence attached
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-brand-ink px-6 py-14 text-center sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-honey/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-brand-teal/20 blur-3xl" />
          <div className="relative mx-auto max-w-xl space-y-6">
            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold tracking-tight text-brand-mist">
              Start with evidence, not hope
            </h2>
            <p className="text-base leading-relaxed text-brand-mist/70">
              Create an organization, connect a repo, and run the first cited readiness check.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {showAppCta ? (
                <Button size="lg" className="w-full active:scale-[0.96] sm:w-auto" asChild>
                  <Link href={APP_HOME}>
                    Open app
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <SignUpButton mode="modal" forceRedirectUrl={APP_HOME}>
                    <Button size="lg" className="w-full active:scale-[0.96] sm:w-auto">
                      Get started
                      <ArrowRight className="size-4" />
                    </Button>
                  </SignUpButton>
                  <SignInButton mode="modal" forceRedirectUrl={APP_HOME}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full border-white/15 bg-transparent text-brand-mist hover:border-white/25 hover:bg-white/5 hover:text-brand-mist active:scale-[0.96] sm:w-auto"
                    >
                      Sign in
                    </Button>
                  </SignInButton>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-16 max-w-6xl px-6 text-center">
        <p className="font-mono text-[0.6875rem] text-muted-foreground">
          OwnBoard · verifiable engineering onboarding
        </p>
      </footer>
    </div>
  );
}
