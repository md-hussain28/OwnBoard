import enum

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class ProjectStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class Project(AuditBase):
    """A team/product a hire is placed on. Bundles project-specific onboarding tracks, dev modules,
    repos and members, and the reference context a new joinee needs to understand the project fast.

    A member must pass every project *track* before the project unlocks for them (Projects PRD §1).
    Beyond gating tracks, a project also carries **modules** — typed, function-targeted dev content —
    plus rich context (`tech_stack`, `resource_links`, `glossary`) and one or more linked repos.
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
    # Legacy single "primary" repo link. Repos are now managed as a list via `ProjectRepo`; this column is
    # kept as the primary pointer (mirrored into ProjectRepo.is_primary) so existing skill-graph hooks work.
    repo_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("repo.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # --- new-joinee context (all optional, edited by an admin or the project's team lead) ---
    # Free-form technologies/frameworks, e.g. ["Next.js", "FastAPI", "Postgres"].
    tech_stack: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    # Reference links: list of {"label": str, "url": str}.
    resource_links: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    # Project glossary / key terms: list of {"term": str, "definition": str}.
    glossary: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb"))
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="projects")
    repo: Mapped["Repo | None"] = relationship(back_populates="projects")
    members: Mapped[list["ProjectMember"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    # Project-specific onboarding tracks (general/company tracks have project_id = NULL).
    tracks: Mapped[list["DocPack"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    repos: Mapped[list["ProjectRepo"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    function_types: Mapped[list["ProjectFunctionType"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    modules: Mapped[list["ProjectModule"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectRepo(AuditBase):
    """One repository linked to a project. A project can list several repos; one may be `is_primary`."""

    __tablename__ = "project_repo"
    __id_prefix__ = "prepo"
    __table_args__ = (UniqueConstraint("project_id", "repo_id", name="uq_project_repo_project_repo"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=False, index=True
    )
    repo_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("repo.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    added_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="repos")
    repo: Mapped["Repo"] = relationship()


class ProjectFunctionType(AuditBase):
    """A per-project, admin/lead-configurable function (e.g. "Frontend", "Backend", "DevOps").

    Modules are tagged with function types; a member is given a function type when added to the project,
    which is what drives automatic assignment of the matching modules. Type sets differ per project.
    """

    __tablename__ = "project_function_type"
    __id_prefix__ = "pfun"
    __table_args__ = (UniqueConstraint("project_id", "name", name="uq_project_function_type_project_name"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    project_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    project: Mapped["Project"] = relationship(back_populates="function_types")


class ProjectMember(AuditBase):
    """One employee's membership of one project.

    Membership auto-assigns the project's gating tracks. `is_lead` grants that member full
    admin-equivalent management of *this* project only (Projects PRD §team-lead). `function_type_id`
    is the member's role/function within the project and drives function-based module auto-assign.
    """

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
    # Scoped admin: a lead can do everything an admin can, but only on projects they lead.
    is_lead: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    # The member's function within this project — the auto-assign key for modules.
    function_type_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("project_function_type.id", ondelete="SET NULL"), nullable=True, index=True
    )
    added_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    project: Mapped["Project"] = relationship(back_populates="members")
    employee: Mapped["Employee"] = relationship()
    function_type: Mapped["ProjectFunctionType | None"] = relationship()
