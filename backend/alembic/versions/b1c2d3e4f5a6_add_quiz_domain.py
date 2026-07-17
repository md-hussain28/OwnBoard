"""Add quiz_domain table and doc_pack.domain_id.

Revision ID: b1c2d3e4f5a6
Revises: a8c9d0e1f2b3
Create Date: 2026-07-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: str | Sequence[str] | None = "a8c9d0e1f2b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "quiz_domain",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("org_id", sa.String(length=64), sa.ForeignKey("organization.id"), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("org_id", "name", name="uq_quiz_domain_org_name"),
    )
    op.create_index("ix_quiz_domain_org_id", "quiz_domain", ["org_id"])

    op.add_column(
        "doc_pack",
        sa.Column("domain_id", sa.String(length=64), nullable=True),
    )
    op.create_foreign_key(
        "fk_doc_pack_domain_id",
        "doc_pack",
        "quiz_domain",
        ["domain_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_doc_pack_domain_id", "doc_pack", ["domain_id"])


def downgrade() -> None:
    op.drop_index("ix_doc_pack_domain_id", table_name="doc_pack")
    op.drop_constraint("fk_doc_pack_domain_id", "doc_pack", type_="foreignkey")
    op.drop_column("doc_pack", "domain_id")
    op.drop_index("ix_quiz_domain_org_id", table_name="quiz_domain")
    op.drop_table("quiz_domain")
