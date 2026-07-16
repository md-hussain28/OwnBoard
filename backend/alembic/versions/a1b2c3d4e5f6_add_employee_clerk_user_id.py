"""add employee clerk_user_id for org member sync

Revision ID: a1b2c3d4e5f6
Revises: 9e57e0476019
Create Date: 2026-07-17 00:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "9e57e0476019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("employee", sa.Column("clerk_user_id", sa.String(length=64), nullable=True))
    op.create_index("ix_employee_clerk_user_id", "employee", ["clerk_user_id"])
    op.create_unique_constraint("uq_employee_org_clerk_user", "employee", ["org_id", "clerk_user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_employee_org_clerk_user", "employee", type_="unique")
    op.drop_index("ix_employee_clerk_user_id", table_name="employee")
    op.drop_column("employee", "clerk_user_id")
