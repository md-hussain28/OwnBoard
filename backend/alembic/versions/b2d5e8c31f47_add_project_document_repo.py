"""Add project_document_repo (doc ↔ repo attachment)

Revision ID: b2d5e8c31f47
Revises: 1bd454bb2a82
Create Date: 2026-07-19 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2d5e8c31f47"
down_revision: Union[str, Sequence[str], None] = "1bd454bb2a82"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "project_document_repo",
        sa.Column("org_id", sa.String(length=64), nullable=False),
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("repo_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["doc_pack_document.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["repo_id"], ["repo.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["org_id"],
            ["organization.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", "repo_id", name="uq_project_document_repo_doc_repo"),
    )
    op.create_index(
        op.f("ix_project_document_repo_document_id"), "project_document_repo", ["document_id"], unique=False
    )
    op.create_index(op.f("ix_project_document_repo_repo_id"), "project_document_repo", ["repo_id"], unique=False)
    op.create_index(op.f("ix_project_document_repo_org_id"), "project_document_repo", ["org_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_project_document_repo_org_id"), table_name="project_document_repo")
    op.drop_index(op.f("ix_project_document_repo_repo_id"), table_name="project_document_repo")
    op.drop_index(op.f("ix_project_document_repo_document_id"), table_name="project_document_repo")
    op.drop_table("project_document_repo")
