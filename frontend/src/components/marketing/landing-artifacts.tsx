import { Check, FileText, GitCommitHorizontal, Lock, LockOpen, Send, Sparkles } from "lucide-react";

/** Framed product panel — shared chrome for every exhibit artifact. */
function ArtifactFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[1.25rem] border border-border/80 bg-card shadow-soft"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-2.5">
        <span className="size-2 rounded-full bg-brand-coral/70" />
        <span className="size-2 rounded-full bg-brand-honey/70" />
        <span className="size-2 rounded-full bg-brand-moss/70" />
        <span className="ml-1.5 font-mono text-[0.6875rem] text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

export function GateArtifact() {
  return (
    <ArtifactFrame label="onboarding · payments project">
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
          <span className="text-foreground">Policy comprehension</span>
          <span className="flex items-center gap-2 font-mono text-brand-moss tabular-nums">
            92% <Check className="size-3.5" strokeWidth={2.5} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
          <span className="text-foreground">Codebase readiness</span>
          <span className="flex items-center gap-2 font-mono text-brand-moss tabular-nums">
            88% <Check className="size-3.5" strokeWidth={2.5} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3.5">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            Repo write access
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-brand-moss-soft px-2 py-1 text-[0.6875rem] font-semibold text-brand-moss">
            <LockOpen className="size-3" />
            Unlocked
          </span>
        </div>
        <p className="font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
          track: payments-101 · auto-assigned via domain tag · 4 new hires
        </p>
      </div>
    </ArtifactFrame>
  );
}

export function AskArtifact() {
  return (
    <ArtifactFrame label="ask · payments-service">
      <div className="space-y-4 p-5">
        <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-muted/70 px-3.5 py-2.5 text-sm text-foreground">
          Why do ledger writes check for an idempotency key first?
        </div>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground">
            Retries can land on partially committed writes. The key lets the worker short-circuit
            and return the stored receipt instead of re-applying the side effect — added after the
            double-charge incident in March.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-1 font-mono text-[0.6875rem] text-muted-foreground">
              <FileText className="size-3 text-brand-teal" />
              ledger.ts:114
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-1 font-mono text-[0.6875rem] text-muted-foreground">
              <GitCommitHorizontal className="size-3 text-brand-teal" />
              a3f91c2
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2 py-1 font-mono text-[0.6875rem] text-muted-foreground">
              PR #482
            </span>
          </div>
          <p className="border-t border-border/70 pt-3 font-mono text-[0.6875rem] text-brand-teal">
            grounded · confidence 0.91 · 3 sources
          </p>
        </div>
      </div>
    </ArtifactFrame>
  );
}

const MODULES = [
  { name: "auth", owner: "maya@ 78%", width: "78%", risk: "High risk", tone: "coral" },
  { name: "payments", owner: "spread across 6", width: "34%", risk: "Healthy", tone: "moss" },
  { name: "search", owner: "jon@ 52%", width: "52%", risk: "Watch", tone: "amber" },
] as const;

const RISK_BADGE: Record<string, string> = {
  coral: "bg-brand-coral-soft text-brand-coral",
  moss: "bg-brand-moss-soft text-brand-moss",
  amber: "bg-brand-honey-soft text-brand-amber",
};

const RISK_BAR: Record<string, string> = {
  coral: "bg-brand-coral",
  moss: "bg-brand-moss",
  amber: "bg-brand-amber",
};

export function SkillGraphArtifact() {
  return (
    <ArtifactFrame label="skill graph · 3 repos · computed from git history">
      <div className="space-y-4 p-5">
        {MODULES.map((mod) => (
          <div key={mod.name} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[0.75rem] text-foreground">{mod.name}</span>
              <span
                className={`rounded-[0.3rem] px-1.5 py-0.5 text-[0.625rem] font-semibold ${RISK_BADGE[mod.tone]}`}
              >
                {mod.risk}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${RISK_BAR[mod.tone]}`}
                style={{ width: mod.width }}
              />
            </div>
            <p className="font-mono text-[0.625rem] text-muted-foreground">
              top owner: {mod.owner}
            </p>
          </div>
        ))}
        <p className="border-t border-border/70 pt-3 text-[0.75rem] leading-relaxed text-muted-foreground">
          Sources: git log · blame · numstat — refreshed on every merge.
        </p>
      </div>
    </ArtifactFrame>
  );
}

export function RoutingArtifact() {
  return (
    <ArtifactFrame label="expert routing · drafted for review">
      <div className="space-y-4 p-5">
        <blockquote className="rounded-xl bg-brand-teal-soft/40 p-4 text-sm font-medium leading-relaxed tracking-tight text-foreground">
          “Hi Maya — I&apos;m stuck on the ledger retry path in payments-service. OwnBoard cited
          a3f91c2 and PR #482 but confidence is 0.42. Could you walk me through the idempotency
          contract?”
        </blockquote>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.6875rem] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Send className="size-3 text-brand-teal" />
            to: maya@
          </span>
          <span>why: owns 78% of auth-adjacent ledger code</span>
          <span>evidence: attached</span>
        </div>
      </div>
    </ArtifactFrame>
  );
}

const ASSISTANT_STEPS = [
  "list_new_hires · this week → 3 results",
  "assign_track · payments-101 → sam@, rio@, priya@",
  "completion_report · policy-basics → 1 behind",
] as const;

export function AssistantArtifact() {
  return (
    <ArtifactFrame label="assistant · admin console">
      <div className="space-y-4 p-5">
        <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-muted/70 px-3.5 py-2.5 text-sm text-foreground">
          Assign the payments track to everyone who joined this week.
        </div>
        <ul className="space-y-2">
          {ASSISTANT_STEPS.map((step) => (
            <li
              key={step}
              className="flex items-center gap-2.5 rounded-lg border border-border/70 px-3 py-2 font-mono text-[0.6875rem] text-muted-foreground"
            >
              <Check className="size-3 shrink-0 text-brand-moss" strokeWidth={2.5} />
              {step}
            </li>
          ))}
        </ul>
        <p className="flex gap-2.5 text-sm leading-relaxed text-foreground">
          <Sparkles className="mt-1 size-3.5 shrink-0 text-brand-honey" aria-hidden />
          Done — Sam, Rio, and Priya start with Payments 101. Heads up: Sam is two days behind on
          Policy Basics.
        </p>
      </div>
    </ArtifactFrame>
  );
}
