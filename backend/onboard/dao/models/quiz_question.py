from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class QuizQuestion(AuditBase):
    __tablename__ = "quiz_question"

    quiz_template_id: Mapped[str] = mapped_column(ForeignKey("quiz_template.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str] = mapped_column(String(512), nullable=False)
    source_citation: Mapped[str | None] = mapped_column(Text, nullable=True)

    quiz_template: Mapped["QuizTemplate"] = relationship(back_populates="questions")
