import { CiteChip, type ExhibitKey } from "./cite-chip";

type LedgerRow = {
  failure: string;
  counter: string;
  cites: ExhibitKey[];
};

const LEDGER: LedgerRow[] = [
  {
    failure: "The handbook gets skimmed at 4:50 pm on day one.",
    counter: "Policy scenarios cite the exact paragraph — and passing them is what unlocks access.",
    cites: ["A"],
  },
  {
    failure: "“Any questions?” — asked into a silent Zoom.",
    counter:
      "New hires ask the codebase directly and get answers with file-level citations, in private.",
    cites: ["B"],
  },
  {
    failure: "Skills are whatever people typed into the wiki three years ago.",
    counter:
      "The skill graph is computed from git log, blame, and numstat. Nobody fills in anything.",
    cites: ["C"],
  },
  {
    failure: "The only person who understands billing just resigned.",
    counter: "Bus-factor risk shows up as a number months before it shows up as a resignation.",
    cites: ["C"],
  },
  {
    failure: "New hires either burn a senior’s afternoon — or stay stuck in silence.",
    counter:
      "Low-confidence questions become drafted introductions to the actual code owner, evidence attached.",
    cites: ["D"],
  },
  {
    failure: "Assigning tracks and chasing completion, one spreadsheet row at a time.",
    counter: "Tell the assistant. It assigns tracks, adds members, and reports the gaps itself.",
    cites: ["E"],
  },
];

/** Failure-vs-evidence ledger. Every counter-claim carries its citation. */
export function LandingPain() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <div className="landing-reveal max-w-2xl space-y-4">
        <h2 className="text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold tracking-tight text-foreground">
          Most onboarding is a trust exercise
        </h2>
        <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Read the wiki, ask around, hope it sticks. Nothing verifies that any of it worked — and
          the gaps stay invisible until they&apos;re expensive.
        </p>
      </div>

      <div className="mt-12 border-t border-border">
        <div className="hidden grid-cols-2 gap-10 py-4 md:grid" aria-hidden>
          <span className="text-[0.8125rem] font-semibold text-brand-coral">
            How it fails today
          </span>
          <span className="text-[0.8125rem] font-semibold text-brand-teal">
            What OwnBoard does instead
          </span>
        </div>
        <dl>
          {LEDGER.map((row) => (
            <div
              key={row.failure}
              className="landing-reveal grid gap-3 border-t border-border/70 py-6 first:border-t-0 md:grid-cols-2 md:gap-10 md:py-5 md:first:border-t"
            >
              <dt className="flex gap-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
                <span
                  className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-brand-coral"
                  aria-hidden
                />
                {row.failure}
              </dt>
              <dd className="flex gap-3 text-[0.9375rem] leading-relaxed text-foreground">
                <span
                  className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-brand-teal md:hidden"
                  aria-hidden
                />
                <span>
                  {row.counter}{" "}
                  {row.cites.map((cite) => (
                    <CiteChip key={cite} to={cite} />
                  ))}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
