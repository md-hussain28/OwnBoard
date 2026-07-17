from typing import Literal

from pydantic import BaseModel, Field


class GenerateCodebaseQuizRequest(BaseModel):
    repo_id: str
    custom_instructions: str | None = None


class GeneratePolicyQuizRequest(BaseModel):
    policy_doc_id: str
    custom_instructions: str | None = None


class GenerateDocPackQuizRequest(BaseModel):
    """Doc Pack PRD §2.1/§10.13/§10.14 — admin's generate-step inputs."""

    target_count: int = Field(default=8, ge=5, le=15)
    formats: list[Literal["mcq_4", "true_false", "multi_select"]] = Field(default_factory=lambda: ["mcq_4"])
    custom_instructions: str | None = None


class QuizQuestionCurationItem(BaseModel):
    """One kept question in a curation save; anything generated but omitted here is dropped (PRD §5.5).

    An `id` not present in the current draft is treated as a manually authored question and created.
    For `multi_select`, `correct_answer` is the list of correct option texts; otherwise it is a single
    option text.
    """

    id: str
    question_text: str = Field(min_length=1)
    options: list[str] = Field(min_length=2)
    correct_answer: str | list[str]
    format: Literal["mcq_4", "true_false", "multi_select"] | None = None
    source_citation: str | None = None


class SaveDocPackQuizRequest(BaseModel):
    questions: list[QuizQuestionCurationItem] = Field(min_length=1)
    # Closed-book by default; admin opts into keeping the reading pane open during the quiz.
    open_book: bool = False
    # Pass bar as a percentage (1..100). Defaults to the historical 100% ("everything right").
    pass_pct: int = Field(default=100, ge=1, le=100)


class RegenerateQuestionsRequest(BaseModel):
    question_ids: list[str] = Field(min_length=1)


class GradeAttemptRequest(BaseModel):
    # A single option text for mcq/true-false, or a list of option texts for multi_select.
    answers: dict[str, str | list[str]]
