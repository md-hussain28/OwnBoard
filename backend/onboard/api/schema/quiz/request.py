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
    formats: list[Literal["mcq_4", "true_false"]] = Field(default_factory=lambda: ["mcq_4"])
    custom_instructions: str | None = None


class QuizQuestionCurationItem(BaseModel):
    """One kept question in a curation save; anything generated but omitted here is dropped (PRD §5.5)."""

    id: str
    question_text: str = Field(min_length=1)
    options: list[str] = Field(min_length=2)
    correct_answer: str = Field(min_length=1)
    format: Literal["mcq_4", "true_false"] | None = None
    source_citation: str | None = None


class SaveDocPackQuizRequest(BaseModel):
    questions: list[QuizQuestionCurationItem] = Field(min_length=1)


class RegenerateQuestionsRequest(BaseModel):
    question_ids: list[str] = Field(min_length=1)


class GradeAttemptRequest(BaseModel):
    answers: dict[str, str]
