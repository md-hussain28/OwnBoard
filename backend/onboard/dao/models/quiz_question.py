import enum
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.quiz_template import QuizTemplate


class QuestionFormat(str, enum.Enum):
    mcq_4 = "mcq_4"
    true_false = "true_false"
    # Multiple correct options; `correct_answer` holds a JSON array of the correct option texts and
    # grading is exact set-match. Manually authored only — the generation pipeline emits single-select.
    multi_select = "multi_select"


class QuizQuestion(AuditBase):
    __tablename__ = "quiz_question"
    __id_prefix__ = "ques"

    quiz_template_id: Mapped[str] = mapped_column(ForeignKey("quiz_template.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str] = mapped_column(String(512), nullable=False)
    source_citation: Mapped[str | None] = mapped_column(Text, nullable=True)
    format: Mapped[QuestionFormat | None] = mapped_column(Enum(QuestionFormat, name="question_format"), nullable=True)
    # Doc Pack quizzes only (nullable for policy/codebase quiz types) — which document this question was
    # grounded in, so `regenerate-questions` can redraft against the same document without parsing citation text.
    source_document_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("doc_pack_document.id", ondelete="SET NULL"), nullable=True
    )

    quiz_template: Mapped["QuizTemplate"] = relationship(back_populates="questions")
