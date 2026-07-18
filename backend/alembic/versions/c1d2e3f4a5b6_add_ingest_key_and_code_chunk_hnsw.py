"""add ingest_key table + code_chunk embedding HNSW index

Revision ID: c1d2e3f4a5b6
Revises: a3f1c9d27e40
Create Date: 2026-07-18 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4a5b6"
down_revision: str | Sequence[str] | None = "a3f1c9d27e40"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ingest_key",
        sa.Column("org_id", sa.String(length=64), nullable=False),
        sa.Column("repo_id", sa.String(length=64), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("key_prefix", sa.String(length=16), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"]),
        sa.ForeignKeyConstraint(["repo_id"], ["repo.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ingest_key_org_id"), "ingest_key", ["org_id"], unique=False)
    op.create_index(op.f("ix_ingest_key_repo_id"), "ingest_key", ["repo_id"], unique=False)
    op.create_index(op.f("ix_ingest_key_key_hash"), "ingest_key", ["key_hash"], unique=True)

    # code_chunk existed since the initial schema but never got a vector index — retrieval was
    # a sequential scan. Add the HNSW cosine index now that repo-code RAG actually queries it.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_code_chunk_embedding_hnsw ON code_chunk USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_code_chunk_embedding_hnsw")
    op.drop_index(op.f("ix_ingest_key_key_hash"), table_name="ingest_key")
    op.drop_index(op.f("ix_ingest_key_repo_id"), table_name="ingest_key")
    op.drop_index(op.f("ix_ingest_key_org_id"), table_name="ingest_key")
    op.drop_table("ingest_key")
