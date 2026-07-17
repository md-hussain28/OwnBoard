"""Draft-node concerns: the drafting system prompt, per-slot prompt building, and shape validation."""

from __future__ import annotations

import json

from onboard.dao.models.quiz_question import QuestionFormat
from onboard.services.quiz.generation.models import DraftedQuestion, DraftOutput, SlotPlan

_DRAFT_SYSTEM_PROMPT = (
    "You write rigorous onboarding quiz questions that verify a new hire actually understood the "
    "policy/procedure — not that they can skim for a keyword. You will be given a single passage from an "
    "internal document. Write exactly one single-select question that is answerable strictly from that "
    "passage alone — never from outside/general knowledge.\n\n"
    "Quality bar (must follow):\n"
    "- Test a concrete rule, threshold, obligation, exception, ownership, or decision — not a definition "
    "of an obvious term, a document title, or a section heading.\n"
    "- Prefer scenario / judgment framing: given a realistic workplace situation, what must the hire do "
    "(or not do)? When the passage only states a hard fact (deadline, limit, owner), ask for that fact "
    "precisely rather than inventing a weak scenario.\n"
    "- Wrong options must be plausible near-misses (common misreads, off-by-one thresholds, related but "
    "incorrect owners/steps) — never joke answers, absurd options, or 'all/none of the above'.\n"
    '- Never ask trivial True/False restatements of a single sentence ("X is required. True/False"). '
    "If using true/false, the stem must be a nuanced claim that could reasonably be mistaken.\n"
    "- Do not quote the passage verbatim as the question stem; paraphrase and force comprehension.\n\n"
    'Format: for true/false, `options` must be exactly ["True", "False"] and `correct_answer` must be '
    'exactly "True" or "False". For mcq_4, `options` must contain exactly 4 distinct, plausible strings '
    "and `correct_answer` must be an exact copy of one of them. For multi_select, `options` must contain "
    "exactly 4 distinct plausible strings, and `correct_answers` must list every correct option (2 or 3 of "
    "them) as exact copies — the remaining options must be genuinely incorrect near-misses. Leave "
    "`correct_answer` empty for multi_select; leave `correct_answers` empty otherwise."
)


def _build_draft_prompt(slot: SlotPlan, custom_instructions: str | None, avoid: list[str]) -> str:
    parts = [
        f"Question format required: {slot.format.value}",
        f"Passage (from '{slot.document_title}'):\n{slot.chunk_content}",
        "Write one non-trivial question that a hire who only skimmed would likely miss.",
    ]
    if custom_instructions:
        parts.append(f"Additional instructions from the quiz author: {custom_instructions}")
    if avoid:
        joined = "\n".join(f"- {q}" for q in avoid[-10:])
        parts.append(f"Do not repeat or closely rephrase these already-used questions:\n{joined}")
    if slot.last_failure_reason:
        parts.append(
            f"Your previous attempt for this passage was rejected ({slot.last_failure_reason}). "
            "Write a different, strictly-grounded, higher-quality question this time."
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

    if format == QuestionFormat.multi_select:
        # 4 distinct options; 2..3 correct, each an exact copy of an option; correct_answer stored as a
        # JSON array so grading (_grade_question) set-matches it, matching manually-authored multi_select.
        if len(options) != 4 or len({o.lower() for o in options}) != 4:
            return None
        by_lower = {o.lower(): o for o in options}
        matched: list[str] = []
        for candidate in output.correct_answers:
            hit = by_lower.get(candidate.strip().lower())
            if hit is not None and hit not in matched:
                matched.append(hit)
        if not (2 <= len(matched) <= 3):
            return None
        return DraftedQuestion(question_text=question_text, options=options, correct_answer=json.dumps(matched))

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
