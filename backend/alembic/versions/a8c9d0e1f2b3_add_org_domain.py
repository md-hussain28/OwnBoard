"""Add org_domain table and employee.domain_id.

Revision ID: a8c9d0e1f2b3
Revises: f1a2b3c4d5e6
Create Date: 2026-07-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a8c9d0e1f2b3"
down_revision: str | Sequence[str] | None = "f1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "org_domain",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("org_id", sa.String(length=64), sa.ForeignKey("organization.id"), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("org_id", "name", name="uq_org_domain_org_name"),
    )
    op.create_index("ix_org_domain_org_id", "org_domain", ["org_id"])

    op.add_column(
        "employee",
        sa.Column("domain_id", sa.String(length=64), nullable=True),
    )
    op.create_foreign_key(
        "fk_employee_domain_id",
        "employee",
        "org_domain",
        ["domain_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_employee_domain_id", "employee", ["domain_id"])


def downgrade() -> None:
    op.drop_index("ix_employee_domain_id", table_name="employee")
    op.drop_constraint("fk_employee_domain_id", "employee", type_="foreignkey")
    op.drop_column("employee", "domain_id")
    op.drop_index("ix_org_domain_org_id", table_name="org_domain")
    op.drop_table("org_domain")
