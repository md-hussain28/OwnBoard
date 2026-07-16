import enum
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.config.constants import EMBEDDING_DIMENSION
from onboard.dao.models.base import AuditBase


class DocPackStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"
    needs_review = "needs_review"


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

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DocPackStatus] = mapped_column(
        Enum(DocPackStatus, name="doc_pack_status"),
        nullable=False,
        default=DocPackStatus.draft,
    )
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="doc_packs")
    documents: Mapped[list["DocPackDocument"]] = relationship(back_populates="doc_pack", cascade="all, delete-orphan")
    chunks: Mapped[list["DocChunk"]] = relationship(back_populates="doc_pack", cascade="all, delete-orphan")
    assignments: Mapped[list["PackAssignment"]] = relationship(back_populates="doc_pack", cascade="all, delete-orphan")


class DocPackDocument(AuditBase):
    """One uploaded file inside a Doc Pack; `storage_path` points into Supabase Storage."""

    __tablename__ = "doc_pack_document"

    doc_pack_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
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

    doc_pack: Mapped["DocPack"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocChunk(AuditBase):
    """RAG retrieval unit for Doc Packs — same shape as `code_chunk`, generalized (PRD §12)."""

    __tablename__ = "doc_chunk"

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
    __table_args__ = (UniqueConstraint("doc_pack_id", "employee_id", name="uq_pack_assignment_pack_employee"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    doc_pack_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("doc_pack.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("employee.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
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
