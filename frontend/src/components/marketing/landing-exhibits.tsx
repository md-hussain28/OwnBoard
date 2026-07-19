import { EXHIBITS, type ExhibitKey } from "./cite-chip";
import {
  AskArtifact,
  AssistantArtifact,
  GateArtifact,
  RoutingArtifact,
  SkillGraphArtifact,
} from "./landing-artifacts";

type ExhibitProps = {
  letter: ExhibitKey;
  headline: string;
  body: string;
  detail?: string;
  flip?: boolean;
  children: React.ReactNode;
};

/**
 * One exhibit = one claim + its proof. The A–E lettering is the page's single
 * organizing grammar: cite chips up-page resolve here, and the closing
 * "Sources" list indexes these anchors like a bibliography.
 */
function Exhibit({ letter, headline, body, detail, flip = false, children }: ExhibitProps) {
  const exhibit = EXHIBITS[letter];
  return (
    <article
      id={exhibit.id}
      className="landing-reveal grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <div className={`space-y-5 ${flip ? "lg:order-2" : ""}`}>
        <p className="flex items-baseline gap-2.5 font-mono text-[0.75rem] text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-teal-soft font-semibold text-brand-teal">
            {letter}
          </span>
          Exhibit {letter} · {exhibit.title}
        </p>
        <h3 className="max-w-[18ch] text-[clamp(1.6rem,2.8vw,2.15rem)] font-bold leading-[1.15] tracking-tight text-foreground">
          {headline}
        </h3>
        <p className="max-w-[50ch] text-base leading-relaxed text-muted-foreground">{body}</p>
        {detail ? (
          <p className="max-w-[50ch] text-sm leading-relaxed text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      <div className={`mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none ${flip ? "lg:order-1" : ""}`}>
        {children}
      </div>
    </article>
  );
}

export function LandingExhibits() {
  return (
    <section className="mx-auto max-w-6xl space-y-24 px-6 py-20 lg:space-y-32 lg:py-28">
      <div className="landing-reveal max-w-2xl space-y-4">
        <h2 className="text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold tracking-tight text-foreground">
          The exhibits
        </h2>
        <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Five claims, five proofs — each panel below is the actual shape of the product.
        </p>
      </div>

      <Exhibit
        letter="A"
        headline="Access unlocks when they pass, not when they nod"
        body="Spin up onboarding tracks from your policy packs and repos, targeted by domain, repo, or the whole org — auto-assigned on day one. New hires clear scenario quizzes where every answer opens the paragraph or commit that grounds it."
        detail="Mentors can inject priorities for their repo before the gate opens, so what gets tested is what the team actually cares about."
      >
        <GateArtifact />
      </Exhibit>

      <Exhibit
        letter="B"
        headline="Ask the codebase like it's a patient colleague"
        body="Generative chat over your repos and docs. Answers stream in with the receipts — files, commits, PRs — plus an archaeology mode for “why does this exist?” questions that git blame alone can't answer."
        detail="No question is too dumb to ask a system that never rolls its eyes — and no answer arrives without a source."
        flip
      >
        <AskArtifact />
      </Exhibit>

      <Exhibit
        letter="C"
        headline="The skill graph nobody had to fill in"
        body="OwnBoard reads git history — log, blame, numstat — and computes who owns what across every repo in a project. Single points of failure show up as coral on a dashboard before they show up as attrition."
        detail="Managers see readiness and risk as numbers with receipts. Self-reported skill matrices retire quietly."
      >
        <SkillGraphArtifact />
      </Exhibit>

      <Exhibit
        letter="D"
        headline="Below the confidence bar, it asks a human"
        body="OwnBoard doesn't bluff. When retrieval confidence drops below the threshold, it drafts an introduction: the question, the evidence it found, and why this person — chosen from code ownership, not the org chart."
        detail="Seniors get context instead of cold pings, and only when the system is genuinely stuck. New hires never have to guess who to ask."
        flip
      >
        <RoutingArtifact />
      </Exhibit>

      <Exhibit
        letter="E"
        headline="An assistant for the admin grind"
        body="Admins get an agentic assistant over the whole onboarding operation. Ask who's behind, then fix it in the same sentence — it assigns tracks, adds members, and creates hires, executing real actions with a visible audit trail."
        detail="Every action it takes is listed before the summary, so “done” always means verifiably done."
      >
        <AssistantArtifact />
      </Exhibit>
    </section>
  );
}
