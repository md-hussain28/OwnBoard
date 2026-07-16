from datetime import datetime

from pydantic import BaseModel, ConfigDict

from onboard.dao.models.quiz_template import QuizType


class QuizQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question_text: str
    options: dict | list | None
    source_citation: str | None


class QuizTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: QuizType
    source_ref: str
    custom_instructions: str | None
    questions: list[QuizQuestionResponse] = []


class QuizAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    quiz_template_id: str
    score: float | None
    passed: bool | None
    started_at: datetime | None
    completed_at: datetime | None
