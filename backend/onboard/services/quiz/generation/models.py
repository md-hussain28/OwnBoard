"""State and IO schemas for the quiz generation pipeline (see package docstring)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TypedDict

from pydantic import BaseModel

from onboard.dao.models.quiz_question import QuestionFormat

MAX_DRAFT_RETRIES = 2
# Cosine similarity of the two questions' embeddings, on text-embedding-3-small. Paraphrases of the
# same question land well above this; genuinely different questions sit comfortably below it.
SEMANTIC_DUPLICATE_THRESHOLD = 0.90


class DraftOutput(BaseModel):
    """Structured-output schema the drafting model is constrained to emit (no free-text JSON)."""

    question_text: str
    options: list[str]
    # Single-select (mcq_4 / true_false): the one correct option text.
    correct_answer: str = ""
    # multi_select only: every correct option text (2 or more). Ignored for single-select formats.
    correct_answers: list[str] = []


class VerifyOutput(BaseModel):
    """Structured-output schema for the independent verification pass."""

    answer: str = ""  # single-select: exact text of the option believed correct, or "UNANSWERABLE"
    answers: list[str] = []  # multi_select: every option the verifier believes is correct


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
