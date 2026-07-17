import enum

from sqlalchemy import Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class ProjectStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class Project(AuditBase):
    """A team/product a hire is placed on. Bundles project-specific onboarding tracks and members.

    A member must pass every project track before the project unlocks for them (Projects PRD §1).
    An optional `repo_id` links the project to a connected repo so its ready members become the
    documented go-to people for that codebase.
    """

    __tablename__ = "project"
    __id_prefix__ = "proj"

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status"),
        nullable=False,
        default=ProjectStatus.active,
    )
    # Optional link to a connected repo — powers the "who's the go-to person for this codebase" panel.
    repo_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("repo.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="projects")
    repo: Mapped["Repo | None"] = relationship(back_populates="projects")
    members: Mapped[list["ProjectMember"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    # Project-specific onboarding tracks (general/company tracks have project_id = NULL).
    tracks: Mapped[list["DocPack"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectMember(AuditBase):
    """One employee's membership of one project. Membership is what auto-assigns the project's tracks."""

    __tablename__ = "project_member"
    __id_prefix__ = "pmem"
    __table_args__ = (UniqueConstraint("project_id", "employee_id", name="uq_project_member_project_employee"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("employee.id", ondelete="CASCADE"), nullable=False, index=True
    )
    added_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="members")
    employee: Mapped["Employee"] = relationship()
