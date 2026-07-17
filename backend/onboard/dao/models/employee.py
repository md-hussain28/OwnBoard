from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.config.constants import APP_ROLE_MEMBER
from onboard.dao.models.base import AuditBase


class Employee(AuditBase):
    __tablename__ = "employee"
    __id_prefix__ = "emp"
    __table_args__ = (UniqueConstraint("org_id", "clerk_user_id", name="uq_employee_org_clerk_user"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    # Clerk user id when this row was synced from an organization membership.
    clerk_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Free-form job title (not Clerk / not OwnBoard access role).
    role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # OwnBoard RBAC: admin | member. Source of truth for product access.
    app_role: Mapped[str] = mapped_column(
        String(32), nullable=False, default=APP_ROLE_MEMBER, server_default=APP_ROLE_MEMBER
    )
    github_handle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Org work domain (Developer, Marketing, …) — optional.
    domain_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("org_domain.id", ondelete="SET NULL"), nullable=True, index=True
    )

    organization: Mapped["Organization"] = relationship(back_populates="employees")
    domain: Mapped["OrgDomain | None"] = relationship(back_populates="employees")
    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="employee", cascade="all, delete-orphan")
    pack_assignments: Mapped[list["PackAssignment"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )
