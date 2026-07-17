"""Verify-node concerns: independent answerability check and semantic-duplicate detection."""

from __future__ import annotations

import json
import math

from onboard.core.llm.llm_client import LLMClient
from onboard.dao.models.quiz_question import QuestionFormat
from onboard.services.quiz.generation.models import (
    SEMANTIC_DUPLICATE_THRESHOLD,
    DraftedQuestion,
    SlotPlan,
    VerifyOutput,
)

_VERIFY_SYSTEM_PROMPT = (
    "You are a strict fact-checker. You will be given a passage, a question, and its answer options. "
    "Answer the question using ONLY the passage — never outside knowledge. For a single-answer question, "
    "reply with ONLY the exact text of the option you believe is correct in `answer`, or the single word "
    "UNANSWERABLE if the passage does not clearly support any one option. For a multiple-answer question "
    "(you'll be told), put EVERY correct option's exact text in `answers`, or leave it empty if the passage "
    "doesn't clearly support a specific set."
)


async def _verify_answerable(llm: LLMClient, slot: SlotPlan, draft: DraftedQuestion) -> tuple[bool, str]:
    options_block = "\n".join(f"- {o}" for o in draft.options)
    is_multi = slot.format == QuestionFormat.multi_select
    kind = "This is a MULTIPLE-answer question." if is_multi else "This is a single-answer question."
    user_prompt = (
        f"{kind}\nPassage:\n{slot.chunk_content}\n\nQuestion: {draft.question_text}\nOptions:\n{options_block}"
    )
    result = await llm.parse(
        [
            {"role": "system", "content": _VERIFY_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        VerifyOutput,
    )
    if result is None:
        return False, "verification pass returned no answer"

    if is_multi:
        try:
            expected = {str(c).strip().lower() for c in json.loads(draft.correct_answer)}
        except (ValueError, TypeError):
            expected = set()
        got = {a.strip().strip('"').strip().lower() for a in result.answers if a and a.strip()}
        if not got:
            return False, "not answerable strictly from the cited passage"
        if got != expected:
            return False, "independent verification pass selected a different set of correct options"
        return True, ""

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


def _is_near_duplicate(embedding: list[float], against: list[list[float]]) -> bool:
    return any(_cosine(prior, embedding) > SEMANTIC_DUPLICATE_THRESHOLD for prior in against)
