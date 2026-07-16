from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class ExpertiseAvailability(AuditBase):
    __tablename__ = "expertise_availability"

    contributor_id: Mapped[str] = mapped_column(
        ForeignKey("contributor.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    contributor: Mapped["Contributor"] = relationship(back_populates="availability")
