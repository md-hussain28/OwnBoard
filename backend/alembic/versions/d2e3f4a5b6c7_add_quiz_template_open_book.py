"""add_quiz_template_open_book

Revision ID: d2e3f4a5b6c7
Revises: b1c2d3e4f5a6
Create Date: 2026-07-17

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d2e3f4a5b6c7"
down_revision: str | Sequence[str] | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Closed-book by default — admin opts into open-book when publishing a pack quiz.
    op.add_column(
        "quiz_template",
        sa.Column("open_book", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("quiz_template", "open_book", server_default=None)


def downgrade() -> None:
    op.drop_column("quiz_template", "open_book")
