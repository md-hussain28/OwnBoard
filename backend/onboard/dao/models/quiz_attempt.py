from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.employee import Employee
    from onboard.dao.models.quiz_template import QuizTemplate


class QuizAttempt(AuditBase):
    __tablename__ = "quiz_attempt"
    __id_prefix__ = "attm"

    employee_id: Mapped[str] = mapped_column(ForeignKey("employee.id", ondelete="CASCADE"), nullable=False)
    quiz_template_id: Mapped[str] = mapped_column(ForeignKey("quiz_template.id", ondelete="CASCADE"), nullable=False)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    employee: Mapped["Employee"] = relationship(back_populates="quiz_attempts")
    quiz_template: Mapped["QuizTemplate"] = relationship(back_populates="attempts")
