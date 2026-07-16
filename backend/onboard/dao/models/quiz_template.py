import enum

from sqlalchemy import Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class QuizType(str, enum.Enum):
    policy = "policy"
    codebase = "codebase"
    doc_pack = "doc_pack"


class QuizTemplate(AuditBase):
    __tablename__ = "quiz_template"

    type: Mapped[QuizType] = mapped_column(Enum(QuizType, name="quiz_type"), nullable=False)
    source_ref: Mapped[str] = mapped_column(String(512), nullable=False)
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    questions: Mapped[list["QuizQuestion"]] = relationship(back_populates="quiz_template", cascade="all, delete-orphan")
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="quiz_template", cascade="all, delete-orphan")
