"""add_quiz_question_source_document

Revision ID: 9e57e0476019
Revises: 77bde8f0a115
Create Date: 2026-07-16 22:16:06.788061

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9e57e0476019"
down_revision: str | Sequence[str] | None = "77bde8f0a115"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Which document a generated Doc Pack question was grounded in, so `regenerate-questions` can redraft
    # against the same document without parsing the human-readable citation string (Doc Pack PRD §6).
    op.add_column("quiz_question", sa.Column("source_document_id", sa.String(length=64), nullable=True))
    op.create_foreign_key(
        "fk_quiz_question_source_document_id",
        "quiz_question",
        "doc_pack_document",
        ["source_document_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_quiz_question_source_document_id", "quiz_question", type_="foreignkey")
    op.drop_column("quiz_question", "source_document_id")
