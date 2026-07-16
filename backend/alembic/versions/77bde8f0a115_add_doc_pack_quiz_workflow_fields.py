"""add_doc_pack_quiz_workflow_fields

Revision ID: 77bde8f0a115
Revises: 28e10062c42d
Create Date: 2026-07-16 22:09:35.574248

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "77bde8f0a115"
down_revision: str | Sequence[str] | None = "28e10062c42d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Doc Pack quiz generation/curation workflow (Doc Pack PRD §5/§10.14): per-question format hint,
    # an admin-facing review note for thin/needs_review packs, and quiz_template's draft/publish flag
    # for E1 versioning (§10.12).
    op.add_column("doc_pack", sa.Column("review_note", sa.Text(), nullable=True))
    question_format = sa.Enum("mcq_4", "true_false", name="question_format")
    question_format.create(op.get_bind(), checkfirst=True)
    op.add_column("quiz_question", sa.Column("format", question_format, nullable=True))
    op.add_column(
        "quiz_template",
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("quiz_template", "is_published", server_default=None)


def downgrade() -> None:
    op.drop_column("quiz_template", "is_published")
    op.drop_column("quiz_question", "format")
    op.drop_column("doc_pack", "review_note")
    op.execute("DROP TYPE IF EXISTS question_format")
