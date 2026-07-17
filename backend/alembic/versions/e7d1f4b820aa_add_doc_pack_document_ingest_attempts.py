"""Add ingest_attempts to doc_pack_document (stale-ingest requeue cap).

Revision ID: e7d1f4b820aa
Revises: c4f8a2b91d03
Create Date: 2026-07-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e7d1f4b820aa"
down_revision: str | Sequence[str] | None = "c4f8a2b91d03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "doc_pack_document",
        sa.Column("ingest_attempts", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("doc_pack_document", "ingest_attempts")
