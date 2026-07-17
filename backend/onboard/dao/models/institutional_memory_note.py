from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.contributor import Contributor


class InstitutionalMemoryNote(AuditBase):
    __tablename__ = "institutional_memory_note"
    __id_prefix__ = "note"

    contributor_id: Mapped[str] = mapped_column(ForeignKey("contributor.id", ondelete="CASCADE"), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    contributor: Mapped["Contributor"] = relationship(back_populates="institutional_memory_notes")
