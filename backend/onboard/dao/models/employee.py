from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class Employee(AuditBase):
    __tablename__ = "employee"
    __table_args__ = (UniqueConstraint("org_id", "clerk_user_id", name="uq_employee_org_clerk_user"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    # Clerk user id when this row was synced from an organization membership.
    clerk_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_handle: Mapped[str | None] = mapped_column(String(255), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="employees")
    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    pack_assignments: Mapped[list["PackAssignment"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )
