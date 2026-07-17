"""Add project + project_member tables and doc_pack.project_id.

Revision ID: b7f3c2a19d84
Revises: eb463e90c5f2
Create Date: 2026-07-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b7f3c2a19d84"
down_revision: str | Sequence[str] | None = "eb463e90c5f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "project",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("org_id", sa.String(length=64), sa.ForeignKey("organization.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "archived", name="project_status"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("repo_id", sa.String(length=64), nullable=True),
        sa.Column("created_by", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_project_org_id", "project", ["org_id"])
    op.create_index("ix_project_repo_id", "project", ["repo_id"])
    op.create_foreign_key("fk_project_repo_id", "project", "repo", ["repo_id"], ["id"], ondelete="SET NULL")

    op.create_table(
        "project_member",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("org_id", sa.String(length=64), sa.ForeignKey("organization.id"), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("employee_id", sa.String(length=64), nullable=False),
        sa.Column("added_by", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employee.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("project_id", "employee_id", name="uq_project_member_project_employee"),
    )
    op.create_index("ix_project_member_org_id", "project_member", ["org_id"])
    op.create_index("ix_project_member_project_id", "project_member", ["project_id"])
    op.create_index("ix_project_member_employee_id", "project_member", ["employee_id"])

    op.add_column("doc_pack", sa.Column("project_id", sa.String(length=64), nullable=True))
    op.create_index("ix_doc_pack_project_id", "doc_pack", ["project_id"])
    op.create_foreign_key("fk_doc_pack_project_id", "doc_pack", "project", ["project_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint("fk_doc_pack_project_id", "doc_pack", type_="foreignkey")
    op.drop_index("ix_doc_pack_project_id", table_name="doc_pack")
    op.drop_column("doc_pack", "project_id")

    op.drop_index("ix_project_member_employee_id", table_name="project_member")
    op.drop_index("ix_project_member_project_id", table_name="project_member")
    op.drop_index("ix_project_member_org_id", table_name="project_member")
    op.drop_table("project_member")

    op.drop_constraint("fk_project_repo_id", "project", type_="foreignkey")
    op.drop_index("ix_project_repo_id", table_name="project")
    op.drop_index("ix_project_org_id", table_name="project")
    op.drop_table("project")
    op.execute("DROP TYPE IF EXISTS project_status")
