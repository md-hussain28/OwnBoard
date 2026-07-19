"""Add project module union targeting (target_all_members + target domain/repo tables)

Revision ID: c4e7a1b93d02
Revises: b2d5e8c31f47
Create Date: 2026-07-19 20:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4e7a1b93d02"
down_revision: Union[str, Sequence[str], None] = "b2d5e8c31f47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    NOTE: any pgvector HNSW index "drops" Alembic would autogenerate here are false-positives
    (it can't introspect the vector opclass) — this migration is hand-written and touches none of them.
    """
    # Union-audience base rule: does the module go to every project member?
    op.add_column(
        "doc_pack",
        sa.Column("target_all_members", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    # Seed from the legacy assign_scope: manually-scoped project modules default to "not everyone".
    op.execute(
        "UPDATE doc_pack SET target_all_members = false WHERE project_id IS NOT NULL AND assign_scope = 'manual'"
    )

    op.create_table(
        "doc_pack_target_domain",
        sa.Column("org_id", sa.String(length=64), nullable=False),
        sa.Column("doc_pack_id", sa.String(length=64), nullable=False),
        sa.Column("project_function_type_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["doc_pack_id"], ["doc_pack.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"]),
        sa.ForeignKeyConstraint(["project_function_type_id"], ["project_function_type.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("doc_pack_id", "project_function_type_id", name="uq_pack_target_domain"),
    )
    op.create_index(op.f("ix_doc_pack_target_domain_doc_pack_id"), "doc_pack_target_domain", ["doc_pack_id"])
    op.create_index(op.f("ix_doc_pack_target_domain_org_id"), "doc_pack_target_domain", ["org_id"])
    op.create_index(
        op.f("ix_doc_pack_target_domain_project_function_type_id"),
        "doc_pack_target_domain",
        ["project_function_type_id"],
    )

    op.create_table(
        "doc_pack_target_repo",
        sa.Column("org_id", sa.String(length=64), nullable=False),
        sa.Column("doc_pack_id", sa.String(length=64), nullable=False),
        sa.Column("project_repo_id", sa.String(length=64), nullable=False),
        sa.Column("project_function_type_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["doc_pack_id"], ["doc_pack.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organization.id"]),
        sa.ForeignKeyConstraint(["project_function_type_id"], ["project_function_type.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_repo_id"], ["project_repo.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("doc_pack_id", "project_repo_id", "project_function_type_id", name="uq_pack_target_repo"),
    )
    op.create_index(op.f("ix_doc_pack_target_repo_doc_pack_id"), "doc_pack_target_repo", ["doc_pack_id"])
    op.create_index(op.f("ix_doc_pack_target_repo_org_id"), "doc_pack_target_repo", ["org_id"])
    op.create_index(
        op.f("ix_doc_pack_target_repo_project_function_type_id"),
        "doc_pack_target_repo",
        ["project_function_type_id"],
    )
    op.create_index(op.f("ix_doc_pack_target_repo_project_repo_id"), "doc_pack_target_repo", ["project_repo_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_doc_pack_target_repo_project_repo_id"), table_name="doc_pack_target_repo")
    op.drop_index(op.f("ix_doc_pack_target_repo_project_function_type_id"), table_name="doc_pack_target_repo")
    op.drop_index(op.f("ix_doc_pack_target_repo_org_id"), table_name="doc_pack_target_repo")
    op.drop_index(op.f("ix_doc_pack_target_repo_doc_pack_id"), table_name="doc_pack_target_repo")
    op.drop_table("doc_pack_target_repo")

    op.drop_index(op.f("ix_doc_pack_target_domain_project_function_type_id"), table_name="doc_pack_target_domain")
    op.drop_index(op.f("ix_doc_pack_target_domain_org_id"), table_name="doc_pack_target_domain")
    op.drop_index(op.f("ix_doc_pack_target_domain_doc_pack_id"), table_name="doc_pack_target_domain")
    op.drop_table("doc_pack_target_domain")

    op.drop_column("doc_pack", "target_all_members")
