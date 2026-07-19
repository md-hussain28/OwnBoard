import { BookOpenCheck, Network, UserSearch } from "lucide-react";

const OUTPUTS = [
  {
    icon: BookOpenCheck,
    label: "quiz corpus",
    desc: "Scenario checks cited to paragraphs and commits",
  },
  {
    icon: Network,
    label: "skill graph",
    desc: "Ownership computed from blame and numstat",
  },
  {
    icon: UserSearch,
    label: "expert index",
    desc: "Who to route to, per module, ranked by evidence",
  },
] as const;

function WorkflowSnippet() {
  return (
    <div className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/25">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="font-mono text-[0.6875rem] text-white/50">
          .github/workflows/ownboard.yml
        </span>
        <span className="rounded-[0.3rem] bg-brand-honey/15 px-1.5 py-0.5 font-mono text-[0.625rem] font-medium text-brand-honey">
          on every merge
        </span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed text-white/80">
        <code>
          <span className="text-white/50"># ship ground truth alongside the code</span>
          {"\n"}
          <span className="text-brand-honey">on</span>
          {": push\n"}
          <span className="text-brand-honey">steps</span>
          {":\n  - "}
          <span className="text-brand-honey">uses</span>
          {": "}
          <span className="text-brand-teal">ownboard/ingest@v1</span>
          {"\n    "}
          <span className="text-brand-honey">with</span>
          {":\n      "}
          <span className="text-brand-honey">api-key</span>
          {/* biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub Actions expression syntax, not a JS template */}
          {": ${{ secrets.OWNBOARD_KEY }}"}
        </code>
      </pre>
    </div>
  );
}

/** The fixed-ink "engine room": push-model ingestion feeding three live outputs. */
export function LandingEngine() {
  return (
    <section className="landing-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-28">
        <div className="landing-reveal space-y-5">
          <h2 className="max-w-[18ch] text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold tracking-tight text-white">
            Ground truth ships with every push
          </h2>
          <p className="max-w-[50ch] text-base leading-relaxed text-white/70">
            A GitHub Action posts your repo to OwnBoard on every merge. Commits, ownership, and docs
            get parsed and embedded — so quizzes, the skill graph, and expert routing are built from
            what your team actually shipped, never from a stale export.
          </p>
          <p className="max-w-[50ch] text-sm leading-relaxed text-white/70">
            Nothing is self-reported anywhere in the pipeline. If the answer isn&apos;t in your docs
            or your history, OwnBoard says so.
          </p>
        </div>

        <div className="landing-reveal space-y-4">
          <WorkflowSnippet />
          <div className="grid gap-px overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/10 sm:grid-cols-3">
            {OUTPUTS.map((output) => (
              <div key={output.label} className="space-y-1.5 bg-[oklch(0.24_0.028_75)] p-4">
                <div className="flex items-center gap-2">
                  <output.icon className="size-3.5 text-brand-honey" aria-hidden />
                  <span className="font-mono text-[0.6875rem] font-medium text-white/90">
                    {output.label}
                  </span>
                </div>
                <p className="text-[0.75rem] leading-relaxed text-white/70">{output.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
