"""Add employee.app_role for OwnBoard RBAC.

Revision ID: f1a2b3c4d5e6
Revises: e7d1f4b820aa
Create Date: 2026-07-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: str | Sequence[str] | None = "e7d1f4b820aa"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "employee",
        sa.Column("app_role", sa.String(length=32), nullable=False, server_default="member"),
    )
    # Backfill: Clerk org-admin strings previously stored in free-form role → app_role=admin.
    op.execute(
        """
        UPDATE employee
        SET app_role = 'admin',
            role = NULL
        WHERE role IN ('org:admin', 'admin')
        """
    )


def downgrade() -> None:
    op.drop_column("employee", "app_role")
