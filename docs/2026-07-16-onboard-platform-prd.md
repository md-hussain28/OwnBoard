# Onboard — Product Requirements Document

**Status:** Draft for review
**Context:** OpenAI Codex x NamasteDev Hackathon (4-day build, solo, Jul 15–19)
**Stack:** Next.js (frontend) + FastAPI (backend) + Postgres/pgvector, OpenAI API at runtime

---

## 1. Overview

**Problem.** Onboarding at most engineering companies is broken in two specific ways:

1. Policy/compliance onboarding is skimmed, not verified — companies hand new hires a
   handbook and hope it sticks. There's no proof of comprehension, especially for
   scenario-based judgment (not just recall).
2. Codebase onboarding has no gate at all — new hires start committing to
   production-adjacent code before anyone has verified they understand the
   architecture, the team's conventions, or *why* things are built the way they are.
   Tribal knowledge about non-obvious code lives in senior engineers' heads and is
   re-explained one Slack thread at a time.

Underneath both is a third problem: companies have no structured view of **who
actually knows what**. Skill data is self-reported (unreliable) or nonexistent, so
bus-factor risk (only one person understands subsystem X) goes undetected until that
person is unavailable or leaves.

**Solution.** Onboard is a platform that:

- Turns company docs into scenario-based, cited onboarding quizzes (not recall trivia).
- Turns a codebase's git history into a grounded, cited "readiness" quiz — customizable
  by senior engineers — that gates access to the real repo.
- Infers a real skill graph from git history (not self-reported), detects bus-factor
  risk, and auto-routes new hires to the right expert with a drafted introduction.

None of this is a "paste your docs into ChatGPT" wrapper: every output is grounded in
retrieved source material with citations, computed from data a chat window doesn't have
access to (a team's full git history), and — for the codebase pillar — used to gate a
real access-control decision, not just answer a question.

**Users:**
- **New hire** — goes through the onboarding wizard, takes both quizzes, unlocks repo
  access, gets routed to experts when stuck.
- **Senior engineer / mentor** — injects custom priorities into the codebase quiz
  ("make sure they understand our multi-tenancy model before touching case data"),
  receives auto-routed intro requests.
- **Engineering manager** — views the bus-factor/skill-graph dashboard, monitors
  onboarding progress and common failure points across hires.

---

## 2. Hackathon Judging Alignment

| Criterion | How this project addresses it |
|---|---|
| Originality | Gated, cited, execution-grounded onboarding — not a chatbot wrapper |
| Impact | Attacks bus-factor risk and tribal-knowledge loss, not just "new hire questions" |
| AI fluency | RAG grounding + citations + confidence-based human escalation, used with intent |
| Prototype | Live, deployed, backed by a real public repo's git history |
| Demo | One continuous narrative: quiz → grounded answer → low-confidence escalation → expert routing → dashboard |
| Creativity | Skill graph + bus-factor + routing framed as one data model, three surfaces |

---

## 3. Scope

### 3.1 Real, fully working (core engineering effort)

- **Codebase readiness quiz** — grounded in retrieved code + git history, customizable
  by senior-engineer instructions, cited.
- **Skill graph from git history** — deterministic, LLM-free computation from git
  plumbing (blame/log/numstat).
- **Bus-factor detection + expert auto-routing** — computed from the skill graph,
  surfaces risk, drafts an intro message via LLM using real commit/review evidence.
- **Archaeology-mode Q&A** — "why does X work this way" answered with commit
  provenance, not guessed.

### 3.2 Real but intentionally lighter (working, simpler UI/logic)

- **Policy onboarding quiz** — scenario-based quiz generated directly from provided
  policy doc text (short enough to not need retrieval), with paragraph citations.
- **Manager dashboard** — reads real skill-graph/bus-factor/quiz data into a simple
  bus-factor heatmap + quiz analytics view.
- **Institutional memory capture** — a structured exit-interview UI; demoed with one
  seeded example feeding into a later quiz question, not a fully automated pipeline.

### 3.3 Explicitly out of scope (roadmap only — mention in pitch, do not build)

- Real GitHub org permission API integration for access gating (simulated with an
  in-app unlock state instead).
- Multi-tenant auth/SSO, billing, production hardening.
- Any behavioral/activity tracking (commit timing, communication tone, etc.) — see
  §7 ethics note. Deliberately excluded, not just deferred.
- Self-healing content drift detection (docs vs. code contradiction flags).
- Cross-team internal-mobility/skill-marketplace matching.

---

## 4. Architecture

```
                        ┌─────────────────────┐
                        │   Next.js frontend    │
                        │ (onboarding wizard,   │
                        │  Q&A chat, dashboard) │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   FastAPI backend     │
                        └──────────┬───────────┘
                                   │
        ┌──────────────┬──────────┼──────────────┬───────────────┐
        ▼              ▼          ▼               ▼               ▼
 Repo Ingestion   Skill Graph   RAG Pipeline   Quiz Engine    Expert Router
 (git plumbing:   & Bus-Factor  (chunk+embed   (grounded gen  (score lookup +
  clone, log,      Engine        -> pgvector)   + gating)      LLM-drafted intro)
  blame, numstat)  (pure algo,                                 
                    no LLM)
        │              │              │              │              │
        └──────────────┴──────────────┴──────────────┴──────────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   Postgres + pgvector │
                        └───────────────────────┘
```

**Key decision:** Repo ingestion → skill graph → bus-factor is a **deterministic,
LLM-free pipeline** (pure parsing of `git log`, `git blame`, `git log --numstat`). Only
the RAG pipeline (embeddings/retrieval) and the quiz/Q&A/routing layers call the LLM.
This keeps the hardest-to-fake, most novel part of the product fast, cheap, and
demo-reliable (no risk of a live LLM call flaking during judging), and reserves LLM
usage for where grounding actually requires it.

---

## 5. Data Model (Postgres)

| Table | Key columns | Purpose |
|---|---|---|
| `repo` | id, url, name, ingested_at | Connected codebase |
| `contributor` | id, repo_id, name, email, github_handle | Git author identity |
| `file_expertise` | repo_id, file_path, contributor_id, commit_count, review_count, revert_adjusted_score, last_commit_at | Per-file, per-person expertise signal (recency-decayed, quality-adjusted) |
| `commit_record` | repo_id, hash, message, author_id, committed_at, linked_issue | Provenance for archaeology mode |
| `code_chunk` | repo_id, file_path, content, embedding (pgvector) | RAG retrieval unit |
| `policy_doc` | id, org_id, title, content | Source for policy quiz generation |
| `employee` | id, org_id, name, role, github_handle | New hire / staff record |
| `quiz_template` | id, type (`policy`\|`codebase`), source_ref, custom_instructions | Instructor-configured quiz definition |
| `quiz_question` | quiz_template_id, question_text, options, correct_answer, source_citation | Generated, cited question |
| `quiz_attempt` | employee_id, quiz_template_id, score, passed, started_at, completed_at | Gating state |
| `expertise_availability` | contributor_id, available, notes | Consent/opt-out for routing |
| `institutional_memory_note` | contributor_id, captured_at, topic, content | Exit-interview capture, feeds RAG corpus |

---

## 6. Core Components & Flows

**6.1 Repo Ingestion Pipeline** — clones the target repo, runs `git log --numstat` and
`git blame` across tracked files, parses into `file_expertise` and `commit_record` rows.
Separately chunks source files and embeds them into `code_chunk` for RAG.

**6.2 Skill Graph & Bus-Factor Engine** — pure algorithm, no LLM. Expertise score per
(file, contributor) = commit count × recency-decay factor, down-weighted if a
contributor's changes to that file were followed shortly by a revert/hotfix (quality
adjustment), and review-comment activity counted alongside authored commits. Bus-factor
score per subsystem = concentration of expertise score across contributors (e.g. share
held by the top contributor).

**6.3 Codebase Quiz Generator** — retrieves relevant `code_chunk`s (pgvector similarity)
plus any `custom_instructions` from the quiz template, and prompts the LLM to generate
scenario/consequence-based questions ("what breaks if X"), each carrying a
`source_citation` (file path + line range, or commit hash). If retrieved context is
ambiguous or contradictory, the generator flags the topic for senior-engineer review
instead of fabricating a question.

**6.4 Archaeology-Mode Q&A** — given a "why does X work this way" question, walks the
commit provenance chain for the relevant file/region (via `commit_record` +
`git log --follow`), retrieves linked issue context if present, and produces a cited
answer. Below a confidence threshold, it doesn't guess — it hands off to 6.6.

**6.5 Policy Onboarding Quiz** — policy doc text is short enough to pass directly into
the LLM context (no retrieval needed); generates scenario-based questions with
paragraph-level citations back into `policy_doc.content`.

**6.6 Expert Auto-Routing** — on a low-confidence answer or an explicit "I'm stuck,"
looks up `file_expertise` for the relevant path, selects a primary + backup candidate
(load-balanced, decay- and quality-weighted, filtered by `expertise_availability`), and
has the LLM draft an introduction message referencing the specific commit/review
evidence that makes them the match. Also logs the event for the bus-factor dashboard.

**6.7 Access Gating** — a session-scoped state machine: quiz attempt → score → pass
unlocks the next stage (policy → codebase → "repo access granted" screen); fail routes
back to the specific cited source (paragraph or file/commit) rather than a generic
retry. Gating in this build is a UI/state simulation, not a real GitHub permissions
call (see §3.3).

**6.8 Manager Dashboard** — reads `file_expertise`/bus-factor aggregates and
`quiz_attempt` history into a bus-factor heatmap per subsystem and a quiz
pass-rate/common-failure view.

**6.9 Institutional Memory Capture** — a structured exit-interview form; captured notes
are stored in `institutional_memory_note` and included in the RAG corpus so future quiz
generation and archaeology answers can draw on them.

---

## 7. Error Handling, Edge Cases & Ethics

- **Low-confidence grounding:** if retrieved context doesn't clearly answer a question,
  the system says so explicitly and escalates to a human (6.6) rather than producing a
  plausible-sounding guess. This is a hard product rule, not a fallback — the entire
  premise of "grounded, not generic" collapses if it silently hallucinates when unsure.
- **Ambiguous code (no clear right answer):** the quiz generator flags this for senior
  review rather than manufacturing a question (6.3).
- **Single point of failure (bus factor = 1):** surfaced explicitly as a risk on the
  dashboard, not silently routed around — routing to that one person repeatedly is
  itself a symptom that should be visible to managers, not hidden by the routing
  feature's convenience.
- **Ethics/consent:** no behavioral or activity-based inference (commit timing,
  communication tone) is used anywhere in this system — expertise is inferred only from
  code contribution and review substance, and contributors can opt out of routing via
  `expertise_availability`. This is a deliberate exclusion, worth stating explicitly in
  the pitch, since ambient "employee tracking" framing would undercut trust with both
  users and judges.
- **Repo too large for the 4-day window:** ingestion scope is limited to key
  directories for the chosen demo repo rather than embedding an entire large monorepo.

---

## 8. Demo Flow (3-minute video script outline)

1. New hire connects to demo org → sees policy quiz (scenario question, cited).
2. Passes → codebase quiz appears, includes one question clearly driven by a senior
   engineer's custom instruction.
3. New hire asks an archaeology-mode question ("why is this retry loop here?") → gets a
   cited, commit-grounded answer live.
4. New hire asks a harder question the system isn't confident about → it says so, names
   the specific expert with evidence, and shows the drafted intro message.
5. Cut to manager dashboard → bus-factor heatmap highlights the subsystem just
   discussed, quiz analytics show common failure points across hires.

---

## 9. Testing Approach

- **Unit tests** for the skill-graph/bus-factor scoring algorithm (6.2) — deterministic
  and the easiest thing in this system to get provably right; test recency decay and
  revert-based down-weighting with fixture git histories.
- **Grounding/citation checks** for the RAG pipeline — every generated quiz question and
  archaeology answer must resolve to a real `source_citation`; add an automated check
  that citations point to content that actually exists in the retrieved context.
- **Manual end-to-end rehearsal** of the full demo flow (§8) before recording, since this
  is the artifact judges actually see.

---

## 10. Roadmap (post-hackathon, not built now)

- Real GitHub org permissions integration for actual access gating.
- Docs-vs-code drift detection (self-healing onboarding content).
- Full automation of institutional memory capture (proactive, not scripted).
- Cross-team internal mobility / skill marketplace matching.
