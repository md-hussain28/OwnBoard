import { cn } from "@/lib";

/**
 * The landing page practices what the product preaches: every claim carries a
 * citation. Chips anchor-link to the exhibit that proves the claim.
 */
export const EXHIBITS = {
  A: {
    id: "exhibit-a",
    title: "Verified onboarding",
    source: "Scenario quizzes cited to policy paragraphs and commits; access gates on passing.",
  },
  B: {
    id: "exhibit-b",
    title: "Ask Project",
    source: "Generative chat over repos and docs — answers ship with file-level receipts.",
  },
  C: {
    id: "exhibit-c",
    title: "Skill graph",
    source: "Expertise computed from git log, blame, and numstat. No surveys.",
  },
  D: {
    id: "exhibit-d",
    title: "Expert routing",
    source: "Low confidence becomes a drafted introduction to the actual code owner.",
  },
  E: {
    id: "exhibit-e",
    title: "Admin assistant",
    source: "An agentic assistant that executes onboarding ops, not just reports on them.",
  },
} as const;

export type ExhibitKey = keyof typeof EXHIBITS;

type CiteChipProps = {
  to: ExhibitKey;
  className?: string;
};

/** Inline evidence marker — `[A]` — linking a claim to the exhibit that grounds it. */
export function CiteChip({ to, className }: CiteChipProps) {
  const exhibit = EXHIBITS[to];
  return (
    <a
      href={`#${exhibit.id}`}
      title={`Exhibit ${to} — ${exhibit.title}`}
      className={cn(
        "mx-0.5 inline-flex -translate-y-[0.2em] items-center rounded-[0.3rem] bg-brand-teal-soft px-1 py-px align-middle font-mono text-[0.625rem] font-semibold leading-none text-brand-teal no-underline transition-all duration-200 hover:bg-brand-teal hover:text-background",
        className,
      )}
    >
      {to}
    </a>
  );
}
