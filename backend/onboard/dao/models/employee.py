from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class Employee(AuditBase):
    __tablename__ = "employee"

    org_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_handle: Mapped[str | None] = mapped_column(String(255), nullable=True)

    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
