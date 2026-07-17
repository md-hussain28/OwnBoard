"""Doc Pack quiz generation pipeline (Doc Pack PRD §5, §10.12).

A LangGraph graph with three nodes, `coverage_plan -> draft -> verify -> (retry draft | end)`:

- `coverage_plan` is deterministic (no LLM call): given the pack's processed documents and the
  admin's requested `target_count`/format mix, decide how many question "slots" to draw from each
  document (short docs get fuller coverage, long docs get representative sampling — PRD §5.2) and
  pick a citable chunk for each slot.
- `draft` asks the LLM to write a single-select question grounded *only* in that slot's chunk.
- `verify` re-asks a fresh completion to answer the drafted question using only the same chunk
  (catching hallucinated/unanswerable questions) and checks for near-duplicates against already
  accepted questions. Failures loop back to `draft` (bounded retries) with the failure reason fed
  back in, or are dropped and reported so the caller can flag the pack `needs_review` (PRD §7) rather
  than silently shipping a thin quiz.

Draft and verify LLM calls run concurrently (bounded) within each node; question embeddings for
semantic dedup are batched into a single OpenAI request per verify wave.

The pipeline is split across sibling modules: `models` (state + IO schemas), `planning`
(deterministic slot planning), `drafting` (draft prompt + validation), `verification` (answerability
+ dedup checks), and `graph` (the LangGraph wiring + public entry points).
"""

from onboard.services.quiz.generation.graph import (
    build_generation_graph,
    get_generation_graph,
    run_generation_graph,
    run_regeneration_graph,
)
from onboard.services.quiz.generation.models import (
    ChunkForPlanning,
    DocumentForPlanning,
    DraftedQuestion,
    DraftOutput,
    GenerationState,
    RejectedSlot,
    SlotPlan,
    VerifiedQuestion,
    VerifyOutput,
)
from onboard.services.quiz.generation.planning import plan_coverage

__all__ = [
    "ChunkForPlanning",
    "DocumentForPlanning",
    "DraftOutput",
    "DraftedQuestion",
    "GenerationState",
    "RejectedSlot",
    "SlotPlan",
    "VerifiedQuestion",
    "VerifyOutput",
    "build_generation_graph",
    "get_generation_graph",
    "plan_coverage",
    "run_generation_graph",
    "run_regeneration_graph",
]
