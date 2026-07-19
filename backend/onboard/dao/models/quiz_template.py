import enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.quiz_attempt import QuizAttempt
    from onboard.dao.models.quiz_question import QuizQuestion


class QuizType(str, enum.Enum):
    policy = "policy"
    codebase = "codebase"
    doc_pack = "doc_pack"


class QuizTemplate(AuditBase):
    __tablename__ = "quiz_template"
    __id_prefix__ = "quiz"

    type: Mapped[QuizType] = mapped_column(Enum(QuizType, name="quiz_type"), nullable=False)
    source_ref: Mapped[str] = mapped_column(String(512), nullable=False)
    custom_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Doc Pack E1 versioning (Doc Pack PRD §4/§10.12): a template starts as an unpublished curation draft;
    # `PUT /doc-packs/{id}/quiz` publishes it (is_published=True), at which point it's immutable — later
    # regenerate/save cycles create a brand-new template row rather than mutating this one, so in-flight
    # (`quiz_in_progress`) and completed (`passed`/`failed`) attempts keep grading against the exact version
    # they started on.
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # When False (default), reading materials are hidden once the quiz starts. Admin opts into open-book.
    open_book: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    questions: Mapped[list["QuizQuestion"]] = relationship(
        back_populates="quiz_template", cascade="all, delete-orphan", passive_deletes=True
    )
    attempts: Mapped[list["QuizAttempt"]] = relationship(
        back_populates="quiz_template", cascade="all, delete-orphan", passive_deletes=True
    )
