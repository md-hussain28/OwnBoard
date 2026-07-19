import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.employee import Employee
    from onboard.dao.models.project import Project, ProjectFunctionType


class ProjectModuleStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class ProjectModuleAssignmentStatus(str, enum.Enum):
    assigned = "assigned"
    in_progress = "in_progress"
    completed = "completed"


class ProjectModule(AuditBase):
    """A dev-facing knowledge unit inside a project — distinct from a gating onboarding *track*.

    Modules carry ramp-up context ("how the payments service is structured", "our frontend testing
    setup"), are tagged with one or more of the project's function types, and auto-assign to members
    whose function matches. Unlike tracks they do NOT gate entry to the project. Tracking reuses the
    same assigned → in_progress → completed pattern as pack assignments, via `ProjectModuleAssignment`.
    """

    __tablename__ = "project_module"
    __id_prefix__ = "pmod"

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Markdown body — the actual context a joinee reads.
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Reference links: list of {"label": str, "url": str}.
    resource_links: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    status: Mapped[ProjectModuleStatus] = mapped_column(
        Enum(ProjectModuleStatus, name="project_module_status"),
        nullable=False,
        default=ProjectModuleStatus.draft,
    )
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    estimated_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="modules")
    type_links: Mapped[list["ProjectModuleType"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True
    )
    assignments: Mapped[list["ProjectModuleAssignment"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", passive_deletes=True
    )


class ProjectModuleType(AuditBase):
    """Tags one module with one project function type (Frontend, Backend, …). A module can have many."""

    __tablename__ = "project_module_type"
    __id_prefix__ = "pmty"
    __table_args__ = (UniqueConstraint("module_id", "function_type_id", name="uq_project_module_type_module_function"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    module_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project_module.id", ondelete="CASCADE"), nullable=False, index=True
    )
    function_type_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project_function_type.id", ondelete="CASCADE"), nullable=False, index=True
    )

    module: Mapped["ProjectModule"] = relationship(back_populates="type_links")
    function_type: Mapped["ProjectFunctionType"] = relationship()


class ProjectModuleAssignment(AuditBase):
    """One member's assignment to one module — completion tracking, no quiz gating."""

    __tablename__ = "project_module_assignment"
    __id_prefix__ = "pmasgn"
    __table_args__ = (
        UniqueConstraint("module_id", "employee_id", name="uq_project_module_assignment_module_employee"),
    )

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    module_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project_module.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("employee.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    auto_assigned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    status: Mapped[ProjectModuleAssignmentStatus] = mapped_column(
        Enum(ProjectModuleAssignmentStatus, name="project_module_assignment_status"),
        nullable=False,
        default=ProjectModuleAssignmentStatus.assigned,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    module: Mapped["ProjectModule"] = relationship(back_populates="assignments")
    employee: Mapped["Employee"] = relationship()
