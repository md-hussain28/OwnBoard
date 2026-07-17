"""LangGraph wiring and public entry points for the quiz generation pipeline."""

from __future__ import annotations

import asyncio
from typing import Any

from langgraph.graph import END, StateGraph

from onboard.config.constants import QUIZ_LLM_CONCURRENCY
from onboard.core.llm.llm_client import LLMClient
from onboard.services.quiz.generation.drafting import _DRAFT_SYSTEM_PROMPT, _build_draft_prompt, _validate_draft
from onboard.services.quiz.generation.models import (
    MAX_DRAFT_RETRIES,
    DocumentForPlanning,
    DraftedQuestion,
    DraftOutput,
    GenerationState,
    RejectedSlot,
    SlotPlan,
    VerifiedQuestion,
)
from onboard.services.quiz.generation.planning import plan_coverage
from onboard.services.quiz.generation.verification import _is_near_duplicate, _verify_answerable

_compiled_graph: Any = None
_compiled_graph_llm_id: int | None = None


async def _map_with_concurrency[T](items: list[T], concurrency: int, worker) -> list:
    """Run `worker(item)` over items with a bounded semaphore; preserves input order."""
    if not items:
        return []
    sem = asyncio.Semaphore(max(1, concurrency))

    async def run(item: T):
        async with sem:
            return await worker(item)

    return list(await asyncio.gather(*(run(item) for item in items)))


def build_generation_graph(llm: LLMClient):
    async def coverage_plan_node(state: GenerationState) -> dict[str, Any]:
        slots = plan_coverage(state["documents"], state["target_count"], state["formats"])
        return {"pending": slots}

    async def draft_node(state: GenerationState) -> dict[str, Any]:
        drafted = dict(state["drafted"])
        still_pending: list[SlotPlan] = []
        rejected = list(state["rejected"])
        avoid = [q.drafted.question_text for q in state["accepted"]]
        custom_instructions = state["custom_instructions"]
        pending = list(state["pending"])

        async def draft_one(slot: SlotPlan) -> tuple[SlotPlan, DraftedQuestion | None]:
            prompt = _build_draft_prompt(slot, custom_instructions, avoid)
            output = await llm.parse(
                [
                    {"role": "system", "content": _DRAFT_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                DraftOutput,
            )
            return slot, _validate_draft(output, slot.format)

        results = await _map_with_concurrency(pending, QUIZ_LLM_CONCURRENCY, draft_one)

        for slot, parsed in results:
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

        candidates: list[tuple[SlotPlan, DraftedQuestion]] = []
        for slot in state["pending"]:
            draft = drafted.get(slot.slot_id)
            if draft is not None:
                candidates.append((slot, draft))

        if not candidates:
            return {"pending": retry_slots, "drafted": {}, "accepted": accepted, "rejected": rejected}

        # One embedding API call for the whole wave (order-preserving).
        embeddings = await llm.embed_batch([draft.question_text for _, draft in candidates])
        prior_embeddings = [q.embedding for q in accepted if q.embedding is not None]

        to_verify: list[tuple[SlotPlan, DraftedQuestion, list[float]]] = []
        for (slot, draft), embedding in zip(candidates, embeddings, strict=True):
            # Cheap pre-filter against already-accepted questions only. Within-wave duplicates are
            # resolved after parallel verify so a failed sibling doesn't block a similar candidate.
            if _is_near_duplicate(embedding, prior_embeddings):
                if slot.retry_count >= MAX_DRAFT_RETRIES:
                    rejected.append(RejectedSlot(slot=slot, reason="near-duplicate of another accepted question"))
                else:
                    slot.retry_count += 1
                    slot.last_failure_reason = "near-duplicate of another accepted question"
                    retry_slots.append(slot)
                continue
            to_verify.append((slot, draft, embedding))

        async def verify_one(
            item: tuple[SlotPlan, DraftedQuestion, list[float]],
        ) -> tuple[SlotPlan, DraftedQuestion, list[float], bool, str]:
            slot, draft, embedding = item
            ok, reason = await _verify_answerable(llm, slot, draft)
            return slot, draft, embedding, ok, reason

        verify_results = await _map_with_concurrency(to_verify, QUIZ_LLM_CONCURRENCY, verify_one)
        accepted_embeddings = list(prior_embeddings)

        for slot, draft, embedding, ok, reason in verify_results:
            if ok and _is_near_duplicate(embedding, accepted_embeddings):
                ok, reason = False, "near-duplicate of another accepted question"
            if ok:
                accepted.append(VerifiedQuestion(slot=slot, drafted=draft, embedding=embedding))
                accepted_embeddings.append(embedding)
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


def get_generation_graph(llm: LLMClient):
    """Compile once per LLMClient instance (singleton in prod)."""
    global _compiled_graph, _compiled_graph_llm_id
    llm_id = id(llm)
    if _compiled_graph is None or _compiled_graph_llm_id != llm_id:
        _compiled_graph = build_generation_graph(llm)
        _compiled_graph_llm_id = llm_id
    return _compiled_graph


async def run_generation_graph(
    llm: LLMClient,
    documents: list[DocumentForPlanning],
    target_count: int,
    formats: list[str],
    custom_instructions: str | None,
) -> tuple[list[VerifiedQuestion], list[RejectedSlot]]:
    """Runs the full coverage_plan → draft → verify(→retry) pipeline. Returns (accepted, rejected)."""
    app = get_generation_graph(llm)
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
