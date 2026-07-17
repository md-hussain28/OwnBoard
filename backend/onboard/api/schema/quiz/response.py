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
