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
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph
from pydantic import BaseModel

from onboard.core.common.ids import generate_id
from onboard.core.llm.llm_client import LLMClient
from onboard.dao.models.quiz_question import QuestionFormat

MAX_DRAFT_RETRIES = 2
# Cosine similarity of the two questions' embeddings, on text-embedding-3-small. Paraphrases of the
# same question land well above this; genuinely different questions sit comfortably below it.
SEMANTIC_DUPLICATE_THRESHOLD = 0.90


class DraftOutput(BaseModel):
    """Structured-output schema the drafting model is constrained to emit (no free-text JSON)."""

    question_text: str
    options: list[str]
    correct_answer: str


class VerifyOutput(BaseModel):
    """Structured-output schema for the independent verification pass."""

    answer: str  # exact text of the option believed correct, or "UNANSWERABLE"


@dataclass
class ChunkForPlanning:
    chunk_index: int
    content: str
    page_start: int | None
    page_end: int | None


@dataclass
class DocumentForPlanning:
    document_id: str
    title: str
    chunks: list[ChunkForPlanning] = field(default_factory=list)


@dataclass
class SlotPlan:
    slot_id: str
    document_id: str
    document_title: str
    format: QuestionFormat
    chunk_content: str
    citation: str
    retry_count: int = 0
    last_failure_reason: str | None = None


@dataclass
class DraftedQuestion:
    question_text: str
    options: list[str]
    correct_answer: str


@dataclass
class VerifiedQuestion:
    slot: SlotPlan
    drafted: DraftedQuestion
    embedding: list[float] | None = None


@dataclass
class RejectedSlot:
    slot: SlotPlan
    reason: str


class GenerationState(TypedDict):
    documents: list[DocumentForPlanning]
    target_count: int
    formats: list[str]
    custom_instructions: str | None
    pending: list[SlotPlan]
    drafted: dict[str, DraftedQuestion]
    accepted: list[VerifiedQuestion]
    rejected: list[RejectedSlot]


def _stride_sample(chunks: list[ChunkForPlanning], count: int) -> list[ChunkForPlanning]:
    if count >= len(chunks):
        return list(chunks)
    if count <= 0:
        return []
    step = len(chunks) / count
    return [chunks[int(i * step)] for i in range(count)]


def _citation_for(title: str, chunk: ChunkForPlanning) -> str:
    if chunk.page_start is not None:
        if chunk.page_end and chunk.page_end != chunk.page_start:
            return f"{title}, p. {chunk.page_start}-{chunk.page_end}"
        return f"{title}, p. {chunk.page_start}"
    return f"{title}, chunk {chunk.chunk_index}"


def plan_coverage(documents: list[DocumentForPlanning], target_count: int, formats: list[str]) -> list[SlotPlan]:
    """Deterministic slot planning — no LLM call (Doc Pack PRD §5.2)."""
    docs = [d for d in documents if d.chunks]
    if not docs:
        return []

    if len(docs) > target_count:
        docs = sorted(docs, key=lambda d: len(d.chunks), reverse=True)[:target_count]

    total_docs = len(docs)
    slot_counts = {d.document_id: 1 for d in docs}
    remaining = target_count - total_docs

    if remaining > 0:
        total_chunks = sum(len(d.chunks) for d in docs) or 1
        raw_shares = {d.document_id: remaining * (len(d.chunks) / total_chunks) for d in docs}
        floor_shares = {doc_id: int(share) for doc_id, share in raw_shares.items()}
        leftover = remaining - sum(floor_shares.values())
        by_remainder = sorted(raw_shares.items(), key=lambda kv: kv[1] - floor_shares[kv[0]], reverse=True)
        for doc_id, _ in by_remainder[:leftover]:
            floor_shares[doc_id] += 1
        for doc_id, extra in floor_shares.items():
            slot_counts[doc_id] += extra

    format_cycle = formats or ["mcq_4"]
    slots: list[SlotPlan] = []
    format_index = 0
    for doc in docs:
        for chunk in _stride_sample(doc.chunks, slot_counts[doc.document_id]):
            fmt = QuestionFormat(format_cycle[format_index % len(format_cycle)])
            format_index += 1
            slots.append(
                SlotPlan(
                    slot_id=generate_id(),
                    document_id=doc.document_id,
                    document_title=doc.title,
                    format=fmt,
                    chunk_content=chunk.content,
                    citation=_citation_for(doc.title, chunk),
                )
            )
    return slots


_DRAFT_SYSTEM_PROMPT = (
    "You write onboarding quiz questions for new hires. You will be given a single passage from an "
    "internal document. Write exactly one single-select question that is answerable strictly from that "
    "passage alone — never from outside/general knowledge. "
    'For a true/false question, `options` must be exactly ["True", "False"] and `correct_answer` must be '
    'exactly "True" or "False". For a 4-option multiple-choice question, `options` must contain exactly 4 '
    "distinct, plausible strings and `correct_answer` must be an exact copy of one of them. Prefer a scenario "
    'framing ("A teammate does X — what should they do?") when the passage supports it, over a bare recall '
    "question."
)


def _build_draft_prompt(slot: SlotPlan, custom_instructions: str | None, avoid: list[str]) -> str:
    parts = [
        f"Question format required: {slot.format.value}",
        f"Passage (from '{slot.document_title}'):\n{slot.chunk_content}",
    ]
    if custom_instructions:
        parts.append(f"Additional instructions from the quiz author: {custom_instructions}")
    if avoid:
        joined = "\n".join(f"- {q}" for q in avoid[-10:])
        parts.append(f"Do not repeat or closely rephrase these already-used questions:\n{joined}")
    if slot.last_failure_reason:
        parts.append(
            f"Your previous attempt for this passage was rejected ({slot.last_failure_reason}). "
            "Write a different, strictly-grounded question this time."
        )
    return "\n\n".join(parts)


def _validate_draft(output: DraftOutput | None, format: QuestionFormat) -> DraftedQuestion | None:
    """Enforce the per-format shape on a structured-output draft (options are already valid JSON)."""
    if output is None:
        return None

    question_text = output.question_text.strip()
    if not question_text:
        return None
    options = [o.strip() for o in output.options if o and o.strip()]
    correct_answer = output.correct_answer.strip()
    if not correct_answer:
        return None

    if format == QuestionFormat.true_false:
        options = ["True", "False"]
        normalized = correct_answer.lower()
        if normalized not in ("true", "false"):
            return None
        correct_answer = "True" if normalized == "true" else "False"
    else:
        if len(options) != 4 or len({o.lower() for o in options}) != 4:
            return None
        match = next((o for o in options if o.lower() == correct_answer.lower()), None)
        if match is None:
            return None
        correct_answer = match

    return DraftedQuestion(question_text=question_text, options=options, correct_answer=correct_answer)


_VERIFY_SYSTEM_PROMPT = (
    "You are a strict fact-checker. You will be given a passage, a question, and its answer options. "
    "Answer the question using ONLY the passage — never outside knowledge. Reply with ONLY the exact text "
    "of the option you believe is correct, or the single word UNANSWERABLE if the passage does not clearly "
    "support any one option."
)


async def _verify_answerable(llm: LLMClient, slot: SlotPlan, draft: DraftedQuestion) -> tuple[bool, str]:
    options_block = "\n".join(f"- {o}" for o in draft.options)
    user_prompt = f"Passage:\n{slot.chunk_content}\n\nQuestion: {draft.question_text}\nOptions:\n{options_block}"
    result = await llm.parse(
        [
            {"role": "system", "content": _VERIFY_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        VerifyOutput,
    )
    if result is None:
        return False, "verification pass returned no answer"
    answer = result.answer.strip().strip('"').strip()
    if answer.upper().startswith("UNANSWERABLE"):
        return False, "not answerable strictly from the cited passage"
    if answer.lower() != draft.correct_answer.lower():
        return False, "independent verification pass disagreed with the drafted answer"
    return True, ""


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def build_generation_graph(llm: LLMClient):
    async def coverage_plan_node(state: GenerationState) -> dict[str, Any]:
        slots = plan_coverage(state["documents"], state["target_count"], state["formats"])
        return {"pending": slots}

    async def draft_node(state: GenerationState) -> dict[str, Any]:
        drafted = dict(state["drafted"])
        still_pending: list[SlotPlan] = []
        rejected = list(state["rejected"])
        avoid = [q.drafted.question_text for q in state["accepted"]]

        for slot in state["pending"]:
            prompt = _build_draft_prompt(slot, state["custom_instructions"], avoid)
            output = await llm.parse(
                [
                    {"role": "system", "content": _DRAFT_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                DraftOutput,
            )
            parsed = _validate_draft(output, slot.format)
            if parsed is None:
                if slot.retry_count >= MAX_DRAFT_RETRIES:
                    rejected.append(RejectedSlot(slot=slot, reason="model did not return a usable question"))
                    continue
                slot.retry_count += 1
                slot.last_failure_reason = "malformed response"
                still_pending.append(slot)
                continue
            drafted[slot.slot_id] = parsed
            still_pending.append(slot)

        return {"pending": still_pending, "drafted": drafted, "rejected": rejected}

    async def verify_node(state: GenerationState) -> dict[str, Any]:
        drafted = state["drafted"]
        accepted = list(state["accepted"])
        rejected = list(state["rejected"])
        retry_slots: list[SlotPlan] = []

        for slot in state["pending"]:
            draft = drafted.get(slot.slot_id)
            if draft is None:
                continue

            # Semantic dedup: compare embeddings, not surface text, so paraphrases are caught too.
            draft_embedding = await llm.embed(draft.question_text)
            is_duplicate = any(
                q.embedding is not None and _cosine(q.embedding, draft_embedding) > SEMANTIC_DUPLICATE_THRESHOLD
                for q in accepted
            )
            if is_duplicate:
                ok, reason = False, "near-duplicate of another accepted question"
            else:
                ok, reason = await _verify_answerable(llm, slot, draft)

            if ok:
                accepted.append(VerifiedQuestion(slot=slot, drafted=draft, embedding=draft_embedding))
                continue

            if slot.retry_count >= MAX_DRAFT_RETRIES:
                rejected.append(RejectedSlot(slot=slot, reason=reason))
                continue

            slot.retry_count += 1
            slot.last_failure_reason = reason
            retry_slots.append(slot)

        return {"pending": retry_slots, "drafted": {}, "accepted": accepted, "rejected": rejected}

    def route_after_verify(state: GenerationState) -> str:
        return "draft" if state["pending"] else END

    graph = StateGraph(GenerationState)
    graph.add_node("coverage_plan", coverage_plan_node)
    graph.add_node("draft", draft_node)
    graph.add_node("verify", verify_node)
    graph.set_entry_point("coverage_plan")
    graph.add_edge("coverage_plan", "draft")
    graph.add_edge("draft", "verify")
    graph.add_conditional_edges("verify", route_after_verify, {"draft": "draft", END: END})
    return graph.compile()


async def run_generation_graph(
    llm: LLMClient,
    documents: list[DocumentForPlanning],
    target_count: int,
    formats: list[str],
    custom_instructions: str | None,
) -> tuple[list[VerifiedQuestion], list[RejectedSlot]]:
    """Runs the full coverage_plan → draft → verify(→retry) pipeline. Returns (accepted, rejected)."""
    app = build_generation_graph(llm)
    initial: GenerationState = {
        "documents": documents,
        "target_count": target_count,
        "formats": formats,
        "custom_instructions": custom_instructions,
        "pending": [],
        "drafted": {},
        "accepted": [],
        "rejected": [],
    }
    slot_ceiling = max(target_count, 1)
    final_state = await app.ainvoke(initial, config={"recursion_limit": (MAX_DRAFT_RETRIES + 2) * slot_ceiling + 10})
    return final_state["accepted"], final_state["rejected"]


async def run_regeneration_graph(
    llm: LLMClient,
    slot: SlotPlan,
    custom_instructions: str | None,
    avoid: list[str],
) -> VerifiedQuestion | None:
    """Re-run draft→verify for a single existing slot (used by the regenerate-questions endpoint)."""
    slot.retry_count = 0
    slot.last_failure_reason = None
    for _ in range(MAX_DRAFT_RETRIES + 1):
        prompt = _build_draft_prompt(slot, custom_instructions, avoid)
        output = await llm.parse(
            [
                {"role": "system", "content": _DRAFT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            DraftOutput,
        )
        draft = _validate_draft(output, slot.format)
        if draft is not None:
            ok, reason = await _verify_answerable(llm, slot, draft)
            if ok:
                return VerifiedQuestion(slot=slot, drafted=draft)
            slot.last_failure_reason = reason
        else:
            slot.last_failure_reason = "malformed response"
        slot.retry_count += 1
    return None
