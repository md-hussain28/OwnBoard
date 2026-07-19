import { Check, GitCommitHorizontal, Send } from "lucide-react";
import { CiteChip } from "./cite-chip";
import { LandingCtas } from "./landing-ctas";

function CitedQuizCard() {
  return (
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
  );
}

function BusFactorMini() {
  return (
    <div
      className="landing-drift absolute -top-9 right-0 hidden w-52 rounded-xl border border-border/80 bg-card p-3.5 shadow-soft lg:block xl:-right-8"
      style={{ "--drift-rotate": "1.5deg", animationDelay: "1.4s" } as React.CSSProperties}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[0.625rem] text-muted-foreground">bus-factor · auth</span>
        <span className="rounded-[0.3rem] bg-brand-coral-soft px-1.5 py-0.5 text-[0.625rem] font-semibold text-brand-coral">
          High
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between font-mono text-[0.625rem] text-muted-foreground">
          <span>maya@</span>
          <span className="tabular-nums">78%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[78%] rounded-full bg-brand-coral" />
        </div>
      </div>
    </div>
  );
}

function RoutedIntroToast() {
  return (
    <div
      className="landing-drift absolute -bottom-[5.5rem] left-4 hidden w-64 rounded-xl border border-border/80 bg-card p-3.5 shadow-soft lg:block xl:-left-6"
      style={{ "--drift-rotate": "-1.25deg" } as React.CSSProperties}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-md bg-brand-teal-soft text-brand-teal">
          <Send className="size-3" />
        </span>
        <span className="font-mono text-[0.625rem] text-muted-foreground">
          intro drafted → maya@
        </span>
      </div>
      <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
        “Hi Maya — stuck on the ledger retry path. Confidence 0.42, evidence attached…”
      </p>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_oklch,var(--brand-honey)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_40%,color-mix(in_oklch,var(--brand-teal)_10%,transparent),transparent_50%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-16 lg:pb-32 lg:pt-24">
        <div className="space-y-7">
          <h1
            className="landing-rise max-w-[16ch] text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-foreground"
            style={{ animationDelay: "0ms" }}
          >
            Onboarding that{" "}
            <em className="font-brand font-semibold italic tracking-[-0.02em] text-brand-amber">
              shows its work
            </em>
          </h1>
          <p
            className="landing-rise max-w-[46ch] text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: "90ms" }}
          >
            OwnBoard generates quizzes cited to your real policies and git history, computes who
            actually knows what from commits — and when it isn&apos;t sure, it introduces you to the
            person who wrote the code instead of guessing.
          </p>
          <div className="landing-rise" style={{ animationDelay: "180ms" }}>
            <LandingCtas />
          </div>
          <p
            className="landing-rise font-mono text-[0.6875rem] text-muted-foreground"
            style={{ animationDelay: "270ms" }}
          >
            Every claim on this page is cited — exhibits <CiteChip to="A" />
            <CiteChip to="B" />
            <CiteChip to="C" />
            <CiteChip to="D" />
            <CiteChip to="E" /> below.
          </p>
        </div>

        <div
          className="landing-panel relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
          aria-hidden
        >
          <div className="absolute -inset-3 rounded-[1.75rem] bg-brand-gradient opacity-[0.12] blur-2xl" />
          <CitedQuizCard />
          <BusFactorMini />
          <RoutedIntroToast />
        </div>
      </div>
    </section>
  );
}
