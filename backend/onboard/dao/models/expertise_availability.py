from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.contributor import Contributor


class ExpertiseAvailability(AuditBase):
    __tablename__ = "expertise_availability"
    __id_prefix__ = "exav"

    contributor_id: Mapped[str] = mapped_column(
        ForeignKey("contributor.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    contributor: Mapped["Contributor"] = relationship(back_populates="availability")
