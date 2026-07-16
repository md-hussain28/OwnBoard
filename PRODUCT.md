# Product

## Register

product

## Users

- **New hire** — goes through policy and codebase-readiness quizzes, unlocks repo access, gets routed to the right expert when they get stuck. Context: onboarding to an unfamiliar codebase, wants to feel competent quickly, is being evaluated so anxiety about "looking dumb" is real.
- **Senior engineer / mentor** — injects custom quiz priorities for their repo, receives routed introduction requests from new hires. Context: busy, interruption-averse; wants confidence that routing is only happening when genuinely warranted.
- **Engineering manager** — views the skill-graph / bus-factor dashboard. Context: scanning for organizational risk (who's a single point of failure), not day-to-day usage.

## Product Purpose

OwnBoard turns onboarding into something verifiable instead of "handbook-and-hope." It generates cited, scenario-based quizzes from policy docs and from a codebase's real git history, infers a non-self-reported skill graph (bus-factor risk) straight from `git log`/`blame`/`numstat`, and auto-routes new hires to the right human expert with an LLM-drafted introduction. Success = a new hire reaches a verified, grounded understanding of both compliance and codebase context faster, and organizational bus-factor risk becomes visible instead of tribal knowledge.

## Brand Personality

**Trustworthy & precise.** This is a system that gates real repo access on real evidence — every claim it makes is grounded and cited, and it says "I don't know, ask a human" rather than bluff. The interface should feel calm, credible, and exact: no filler copy, no manufactured urgency, no gamified cheerfulness. Confidence comes from clarity and citations, not from enthusiasm.

## Anti-references

- **Not generic gradient SaaS.** No gradient-text hero, no tiny uppercase tracked eyebrows, no identical icon-card grids, no marketing-page scaffolding on what is an internal workflow tool.
- **Not gamified onboarding.** No confetti, badges, mascots, or playful progress theatrics — this gates real access, it isn't a game and shouldn't look like one.
- **Not a dense enterprise dashboard.** Avoid Jira/Salesforce-style cramped tables and enterprise chrome; the current grayscale, generous-whitespace direction is correct — keep it calm, not dense.

## Design Principles

1. **Ground every claim.** If the UI states a fact (a quiz answer, an expertise score, a bus-factor rating), show where it comes from — a citation, a commit, a file. Never present a number or claim without a path to its evidence.
2. **Escalate, don't bluff.** Low-confidence states should visibly hand off to a human (an expert-routing prompt, a "needs review" note) rather than presenting a guess as fact.
3. **Calm density over decoration.** Favor whitespace, restrained color, and clear type hierarchy over visual flourish — trust is built by legibility, not by liveliness.
4. **One state, one meaning.** Status/severity (bus-factor risk, quiz pass/fail, access-gate state) must be visually consistent everywhere it appears — a color or icon means the same thing on every screen.
5. **Respect the new hire's anxiety.** Copy and empty/error states should be direct and reassuring, never cute or condescending — a person being evaluated on real access shouldn't feel mocked by the interface.

## Accessibility & Inclusion

Target WCAG 2.1 AA: body text ≥4.5:1 contrast, large text ≥3:1, full keyboard navigation, visible focus states on every interactive element. No additional known user-specific accessibility needs at this time.
