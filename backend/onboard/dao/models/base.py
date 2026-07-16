from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from onboard.core.common.ids import generate_id


class AuditBase(DeclarativeBase):
    """Shared base for all ORM models: string id pk + created_at/updated_at."""

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=generate_id)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
