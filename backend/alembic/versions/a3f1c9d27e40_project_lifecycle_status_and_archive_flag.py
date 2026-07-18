"""project lifecycle status and archive flag

Splits the old two-value project_status (active/archived) into a real lifecycle enum
(not_started/active/paused/completed/abandoned) plus a separate is_archived hide flag.
Existing 'archived' rows become is_archived=true with status='active'.

Revision ID: a3f1c9d27e40
Revises: 9ce7a0813a6e
Create Date: 2026-07-18 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3f1c9d27e40"
down_revision: Union[str, Sequence[str], None] = "9ce7a0813a6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_VALUES = ("not_started", "active", "paused", "completed", "abandoned")
OLD_VALUES = ("active", "archived")


def upgrade() -> None:
    """Upgrade schema."""
    # 1. New hide flag.
    op.add_column(
        "project",
        sa.Column("is_archived", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    # 2. Carry the old 'archived' status onto the new flag before we drop that enum value.
    op.execute("UPDATE project SET is_archived = true WHERE status = 'archived'")

    # 3. Swap the enum type: map the now-defunct 'archived' back to 'active'. Drop the column default
    #    first — a text default can't be auto-cast to the new enum type.
    new_enum = ", ".join(f"'{v}'" for v in NEW_VALUES)
    op.execute("ALTER TABLE project ALTER COLUMN status DROP DEFAULT")
    op.execute(f"CREATE TYPE project_status_new AS ENUM ({new_enum})")
    op.execute(
        "ALTER TABLE project ALTER COLUMN status TYPE project_status_new "
        "USING (CASE WHEN status::text = 'archived' THEN 'active' ELSE status::text END)::project_status_new"
    )
    op.execute("DROP TYPE project_status")
    op.execute("ALTER TYPE project_status_new RENAME TO project_status")
    op.execute("ALTER TABLE project ALTER COLUMN status SET DEFAULT 'active'")


def downgrade() -> None:
    """Downgrade schema."""
    old_enum = ", ".join(f"'{v}'" for v in OLD_VALUES)
    op.execute("ALTER TABLE project ALTER COLUMN status DROP DEFAULT")
    op.execute(f"CREATE TYPE project_status_old AS ENUM ({old_enum})")
    # Collapse lifecycle back to active/archived: archived rows -> 'archived', everything else -> 'active'.
    op.execute(
        "ALTER TABLE project ALTER COLUMN status TYPE project_status_old "
        "USING (CASE WHEN is_archived THEN 'archived' ELSE 'active' END)::project_status_old"
    )
    op.execute("DROP TYPE project_status")
    op.execute("ALTER TYPE project_status_old RENAME TO project_status")
    op.execute("ALTER TABLE project ALTER COLUMN status SET DEFAULT 'active'")
    op.drop_column("project", "is_archived")
