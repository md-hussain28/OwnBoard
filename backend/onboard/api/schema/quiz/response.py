from datetime import datetime

from pydantic import BaseModel, ConfigDict

from onboard.dao.models.quiz_question import QuestionFormat
from onboard.dao.models.quiz_template import QuizType


class QuizQuestionResponse(BaseModel):
    """Employee-facing shape — never includes `correct_answer` (Doc Pack PRD §3)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    question_text: str
    options: dict | list | None
    format: QuestionFormat | None
    source_citation: str | None


class QuizQuestionAdminResponse(QuizQuestionResponse):
    """Admin/curation view — includes the correct answer for editing (Doc Pack PRD §5.5)."""

    correct_answer: str


class QuizTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: QuizType
    source_ref: str
    custom_instructions: str | None
    is_published: bool
    open_book: bool = False
    questions: list[QuizQuestionResponse] = []


class QuizTemplateAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: QuizType
    source_ref: str
    custom_instructions: str | None
    is_published: bool
    open_book: bool = False
    questions: list[QuizQuestionAdminResponse] = []


class GeneratedSlotIssueResponse(BaseModel):
    document_title: str
    citation: str
    reason: str


class GenerateDocPackQuizResponse(BaseModel):
    """Doc Pack PRD §5.4 — the draft template plus anything the verify pass had to drop."""

    template: QuizTemplateAdminResponse
    rejected_slots: list[GeneratedSlotIssueResponse] = []
    needs_review: bool = False


class QuizAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    quiz_template_id: str
    score: float | None
    passed: bool | None
    started_at: datetime | None
    completed_at: datetime | None


class QuestionGradeResultResponse(BaseModel):
    """Per-question outcome for the post-submit review — never leaks the correct answer (retakes stay honest)."""

    question_id: str
    question_text: str
    correct: bool
    # Citation to send the employee back to for anything they missed ("review these topics").
    source_citation: str | None = None


class GradeAttemptResponse(BaseModel):
    """Grade result: the attempt plus a per-question breakdown so the UI can show what to review on a fail."""

    attempt: QuizAttemptResponse
    score: float
    passed: bool
    pass_pct: int
    correct_count: int
    total_count: int
    results: list[QuestionGradeResultResponse] = []
