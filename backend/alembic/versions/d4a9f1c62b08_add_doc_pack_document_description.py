"""Add doc_pack_document.description (uploader context for RAG grounding)

Revision ID: d4a9f1c62b08
Revises: c4e7a1b93d02
Create Date: 2026-07-19 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4a9f1c62b08"
down_revision: Union[str, Sequence[str], None] = "c4e7a1b93d02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("doc_pack_document", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("doc_pack_document", "description")
