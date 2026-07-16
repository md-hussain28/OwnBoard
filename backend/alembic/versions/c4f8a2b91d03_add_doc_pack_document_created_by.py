"""Add created_by to doc_pack_document (uploader's Clerk user id).

Revision ID: c4f8a2b91d03
Revises: a1b2c3d4e5f6
Create Date: 2026-07-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c4f8a2b91d03"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("doc_pack_document", sa.Column("created_by", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("doc_pack_document", "created_by")
