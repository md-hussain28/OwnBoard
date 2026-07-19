import enum
from datetime import datetime
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.config.constants import EMBEDDING_DIMENSION
from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.employee import Employee
    from onboard.dao.models.org_domain import OrgDomain
    from onboard.dao.models.organization import Organization
    from onboard.dao.models.project import Project
    from onboard.dao.models.quiz_domain import QuizDomain


class DocPackStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"
    needs_review = "needs_review"


class DocPackAssignScope(str, enum.Enum):
    """Who a *project* module targets. Ignored for company/general tracks (project_id IS NULL)."""

    all_members = "all_members"  # every current + future project member (auto-assigned)
    manual = "manual"  # only the members explicitly assigned via the roster


class DocumentStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class PackAssignmentStatus(str, enum.Enum):
    assigned = "assigned"
    reading = "reading"
    ready_for_quiz = "ready_for_quiz"
    quiz_in_progress = "quiz_in_progress"
    passed = "passed"
    failed = "failed"


class DocPack(AuditBase):
    """Named group of uploaded documents that can generate a grounded quiz (Doc Pack PRD §3)."""

    __tablename__ = "doc_pack"
    __id_prefix__ = "pack"

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    # NULL = general/company onboarding track; set = project-specific track that gates entry to that project.
    project_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DocPackStatus] = mapped_column(
        Enum(DocPackStatus, name="doc_pack_status"),
        nullable=False,
        default=DocPackStatus.draft,
    )
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Quiz topic domain (Policy, Holiday, …) — optional; separate from employee OrgDomain.
    domain_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("quiz_domain.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Audience targeting for auto-assignment (Track PRD §auto-assign). When True, every employee in the
    # org is auto-assigned this track once its quiz is published; otherwise the audience is the set of
    # OrgDomains in `audience_domains`. Manual assignment via the roster still works regardless.
    assign_to_all: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    # True for a project's single knowledge-base pack (holds reference Docs, not a gating/quiz module).
    # These are excluded from the project's Modules list; their documents feed the "Ask project" KB.
    is_knowledge_base: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    # Project modules only: whether the module auto-assigns to every project member or is manually targeted.
    # LEGACY — superseded by the combinable union targeting below (`target_all_members` + target tables).
    # Kept so company tracks and old data still parse; project logic no longer reads it.
    assign_scope: Mapped[DocPackAssignScope] = mapped_column(
        Enum(DocPackAssignScope, name="doc_pack_assign_scope"),
        nullable=False,
        default=DocPackAssignScope.all_members,
        server_default="all_members",
    )
    # Project modules only: base rule of the union audience — "needed by every project member".
    # The full audience is this OR'd with the target-domain and target-repo rules below, plus any
    # manually-added assignees (pack_assignment rows with auto_assigned=False). See §Projects module targeting.
    target_all_members: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    # Pass bar as a percentage 1..100 (default 100 = the historical "must get everything right"). Grading
    # compares the attempt score against this threshold instead of a hard-coded 1.0 (Doc Pack PRD §10.6).
    pass_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=100, server_default="100")
    # Position in the org's onboarding sequence (0-based). Tracks are surfaced to employees in this order and,
    # when hard-locking is on, a track stays locked until every lower-ordered required track is passed.
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # Estimated reading/quiz time in minutes — admin-set, else derived from page count on first render.
    estimated_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Days after assignment that the track is due. Null = no due date. Snapshotted onto each assignment's
    # `due_at` at assign time so later policy changes don't retroactively move an existing hire's deadline.
    due_offset_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="doc_packs")
    project: Mapped["Project | None"] = relationship(back_populates="tracks")
    domain: Mapped["QuizDomain | None"] = relationship(back_populates="doc_packs")
    documents: Mapped[list["DocPackDocument"]] = relationship(back_populates="doc_pack", cascade="all, delete-orphan")
    chunks: Mapped[list["DocChunk"]] = relationship(back_populates="doc_pack", cascade="all, delete-orphan")
    assignments: Mapped[list["PackAssignment"]] = relationship(back_populates="doc_pack", cascade="all, delete-orphan")
    audience_domains: Mapped[list["DocPackAudienceDomain"]] = relationship(
        back_populates="doc_pack", cascade="all, delete-orphan"
    )
    # Project-module union targeting rules (see DocPackTargetDomain / DocPackTargetRepo).
    target_domains: Mapped[list["DocPackTargetDomain"]] = relationship(
        back_populates="doc_pack", cascade="all, delete-orphan"
    )
    target_repos: Mapped[list["DocPackTargetRepo"]] = relationship(
        back_populates="doc_pack", cascade="all, delete-orphan"
    )


class DocPackTargetDomain(AuditBase):
    """Project-module union rule: 'this onboarding doc is needed for members of this project domain'.

    Links a project module (DocPack with project_id set) to a ProjectFunctionType (the per-project
    "domain"/expertise). A member matches if their `function_type_id` is one of these."""

    __tablename__ = "doc_pack_target_domain"
    __id_prefix__ = "dptd"
    __table_args__ = (UniqueConstraint("doc_pack_id", "project_function_type_id", name="uq_pack_target_domain"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    doc_pack_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_function_type_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project_function_type.id", ondelete="CASCADE"), nullable=False, index=True
    )

    doc_pack: Mapped["DocPack"] = relationship(back_populates="target_domains")


class DocPackTargetRepo(AuditBase):
    """Project-module union rule: 'needed by people working on this repo (optionally only those of a domain)'.

    Links a project module to a ProjectRepo link; a member matches if they're assigned to that repo
    (ProjectRepoMember) and — when `project_function_type_id` is set — also of that domain."""

    __tablename__ = "doc_pack_target_repo"
    __id_prefix__ = "dptr"
    __table_args__ = (
        UniqueConstraint("doc_pack_id", "project_repo_id", "project_function_type_id", name="uq_pack_target_repo"),
    )

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    doc_pack_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_repo_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("project_repo.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Optional domain filter within the repo. Null = everyone on the repo, regardless of domain.
    project_function_type_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("project_function_type.id", ondelete="CASCADE"), nullable=True, index=True
    )

    doc_pack: Mapped["DocPack"] = relationship(back_populates="target_repos")


class DocPackAudienceDomain(AuditBase):
    """Links a Doc Pack (Track) to an employee OrgDomain it should auto-assign to (Track PRD §auto-assign)."""

    __tablename__ = "doc_pack_audience_domain"
    __id_prefix__ = "paud"
    __table_args__ = (UniqueConstraint("doc_pack_id", "org_domain_id", name="uq_pack_audience_pack_domain"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    doc_pack_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack.id", ondelete="CASCADE"), nullable=False, index=True
    )
    org_domain_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("org_domain.id", ondelete="CASCADE"), nullable=False, index=True
    )

    doc_pack: Mapped["DocPack"] = relationship(back_populates="audience_domains")
    org_domain: Mapped["OrgDomain"] = relationship()


class DocPackDocument(AuditBase):
    """One uploaded file inside a Doc Pack; `storage_path` points into Supabase Storage."""

    __tablename__ = "doc_pack_document"
    __id_prefix__ = "doc"

    doc_pack_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    # Uploader-supplied context ("what is this / which domain / why it matters"). Prepended to each
    # chunk's embedding input at ingest so retrieval for "Ask project" is grounded in the doc's intent.
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_type: Mapped[str] = mapped_column(String(32), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status"),
        nullable=False,
        default=DocumentStatus.uploaded,
    )
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingest_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    doc_pack: Mapped["DocPack"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocChunk(AuditBase):
    """RAG retrieval unit for Doc Packs — same shape as `code_chunk`, generalized (PRD §12)."""

    __tablename__ = "doc_chunk"
    __id_prefix__ = "dchk"

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack_document.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doc_pack_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    page_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIMENSION), nullable=True)

    document: Mapped["DocPackDocument"] = relationship(back_populates="chunks")
    doc_pack: Mapped["DocPack"] = relationship(back_populates="chunks")


class PackAssignment(AuditBase):
    """One hire's assignment to one pack — pre-attempt state machine (Doc Pack PRD §4)."""

    __tablename__ = "pack_assignment"
    __id_prefix__ = "asgn"
    __table_args__ = (UniqueConstraint("doc_pack_id", "employee_id", name="uq_pack_assignment_pack_employee"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    doc_pack_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("employee.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # True when created by the domain/everyone auto-assignment engine rather than the manual roster.
    auto_assigned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # Deadline snapshot, computed from the track's `due_offset_days` at assign time. Null = no due date.
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[PackAssignmentStatus] = mapped_column(
        Enum(PackAssignmentStatus, name="pack_assignment_status"),
        nullable=False,
        default=PackAssignmentStatus.assigned,
    )
    quiz_template_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("quiz_template.id", ondelete="SET NULL"), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    doc_pack: Mapped["DocPack"] = relationship(back_populates="assignments")
    employee: Mapped["Employee"] = relationship(back_populates="pack_assignments")
    acks: Mapped[list["PackAssignmentAck"]] = relationship(back_populates="assignment", cascade="all, delete-orphan")


class PackAssignmentAck(AuditBase):
    """Per-document 'I've read this' gate for an assignment."""

    __tablename__ = "pack_assignment_ack"
    __id_prefix__ = "ack"
    __table_args__ = (UniqueConstraint("assignment_id", "document_id", name="uq_pack_ack_assignment_document"),)

    assignment_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("pack_assignment.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack_document.id", ondelete="CASCADE"), nullable=False, index=True
    )
    acknowledged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    assignment: Mapped["PackAssignment"] = relationship(back_populates="acks")
