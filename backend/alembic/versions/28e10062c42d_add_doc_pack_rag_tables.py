"""add_doc_pack_rag_tables

Revision ID: 28e10062c42d
Revises: 0d9d425d9e66
Create Date: 2026-07-16 21:47:02.247609

"""

from collections.abc import Sequence

import pgvector.sqlalchemy
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "28e10062c42d"
down_revision: str | Sequence[str] | None = "0d9d425d9e66"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add quiz_template.type value for Doc Pack quizzes (PRD §3).
    op.execute("ALTER TYPE quiz_type ADD VALUE IF NOT EXISTS 'doc_pack'")

    op.create_table(
        "doc_pack",
        sa.Column("org_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("draft", "active", "archived", "needs_review", name="doc_pack_status"), nullable=False),
        sa.Column("created_by", sa.String(length=64), nullable=True),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_doc_pack_org_id"), "doc_pack", ["org_id"], unique=False)

    op.create_table(
        "doc_pack_document",
        sa.Column("doc_pack_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("file_type", sa.String(length=32), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("uploaded", "processing", "processed", "failed", name="document_status"),
            nullable=False,
        ),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["doc_pack_id"], ["doc_pack.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_doc_pack_document_doc_pack_id"), "doc_pack_document", ["doc_pack_id"], unique=False)

    op.create_table(
        "pack_assignment",
        sa.Column("org_id", sa.String(length=64), nullable=False),
        sa.Column("doc_pack_id", sa.String(length=64), nullable=False),
        sa.Column("employee_id", sa.String(length=64), nullable=False),
        sa.Column("assigned_by", sa.String(length=64), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "assigned",
                "reading",
                "ready_for_quiz",
                "quiz_in_progress",
                "passed",
                "failed",
                name="pack_assignment_status",
            ),
            nullable=False,
        ),
        sa.Column("quiz_template_id", sa.String(length=64), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["doc_pack_id"], ["doc_pack.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employee.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"]),
        sa.ForeignKeyConstraint(["quiz_template_id"], ["quiz_template.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("doc_pack_id", "employee_id", name="uq_pack_assignment_pack_employee"),
    )
    op.create_index(op.f("ix_pack_assignment_doc_pack_id"), "pack_assignment", ["doc_pack_id"], unique=False)
    op.create_index(op.f("ix_pack_assignment_employee_id"), "pack_assignment", ["employee_id"], unique=False)
    op.create_index(op.f("ix_pack_assignment_org_id"), "pack_assignment", ["org_id"], unique=False)

    op.create_table(
        "doc_chunk",
        sa.Column("org_id", sa.String(length=64), nullable=False),
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("doc_pack_id", sa.String(length=64), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("page_start", sa.Integer(), nullable=True),
        sa.Column("page_end", sa.Integer(), nullable=True),
        sa.Column("section_title", sa.String(length=512), nullable=True),
        sa.Column("embedding", pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=True),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["doc_pack_id"], ["doc_pack.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_id"], ["doc_pack_document.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_doc_chunk_doc_pack_id"), "doc_chunk", ["doc_pack_id"], unique=False)
    op.create_index(op.f("ix_doc_chunk_document_id"), "doc_chunk", ["document_id"], unique=False)
    op.create_index(op.f("ix_doc_chunk_org_id"), "doc_chunk", ["org_id"], unique=False)
    # HNSW cosine index for production-grade similarity search (PRD §12).
    op.execute(
        "CREATE INDEX ix_doc_chunk_embedding_hnsw ON doc_chunk "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    op.create_table(
        "pack_assignment_ack",
        sa.Column("assignment_id", sa.String(length=64), nullable=False),
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["pack_assignment.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_id"], ["doc_pack_document.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assignment_id", "document_id", name="uq_pack_ack_assignment_document"),
    )
    op.create_index(
        op.f("ix_pack_assignment_ack_assignment_id"), "pack_assignment_ack", ["assignment_id"], unique=False
    )
    op.create_index(op.f("ix_pack_assignment_ack_document_id"), "pack_assignment_ack", ["document_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_pack_assignment_ack_document_id"), table_name="pack_assignment_ack")
    op.drop_index(op.f("ix_pack_assignment_ack_assignment_id"), table_name="pack_assignment_ack")
    op.drop_table("pack_assignment_ack")
    op.execute("DROP INDEX IF EXISTS ix_doc_chunk_embedding_hnsw")
    op.drop_index(op.f("ix_doc_chunk_org_id"), table_name="doc_chunk")
    op.drop_index(op.f("ix_doc_chunk_document_id"), table_name="doc_chunk")
    op.drop_index(op.f("ix_doc_chunk_doc_pack_id"), table_name="doc_chunk")
    op.drop_table("doc_chunk")
    op.drop_index(op.f("ix_pack_assignment_org_id"), table_name="pack_assignment")
    op.drop_index(op.f("ix_pack_assignment_employee_id"), table_name="pack_assignment")
    op.drop_index(op.f("ix_pack_assignment_doc_pack_id"), table_name="pack_assignment")
    op.drop_table("pack_assignment")
    op.drop_index(op.f("ix_doc_pack_document_doc_pack_id"), table_name="doc_pack_document")
    op.drop_table("doc_pack_document")
    op.drop_index(op.f("ix_doc_pack_org_id"), table_name="doc_pack")
    op.drop_table("doc_pack")
    op.execute("DROP TYPE IF EXISTS pack_assignment_status")
    op.execute("DROP TYPE IF EXISTS document_status")
    op.execute("DROP TYPE IF EXISTS doc_pack_status")
    # Postgres cannot easily remove an enum value; leave quiz_type.doc_pack in place on downgrade.
