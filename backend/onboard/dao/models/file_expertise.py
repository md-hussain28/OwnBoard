from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.contributor import Contributor
    from onboard.dao.models.repo import Repo


class FileExpertise(AuditBase):
    __tablename__ = "file_expertise"
    __id_prefix__ = "fexp"

    repo_id: Mapped[str] = mapped_column(ForeignKey("repo.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    contributor_id: Mapped[str] = mapped_column(ForeignKey("contributor.id", ondelete="CASCADE"), nullable=False)
    commit_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    review_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revert_adjusted_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_commit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    repo: Mapped["Repo"] = relationship(back_populates="file_expertise_entries")
    contributor: Mapped["Contributor"] = relationship(back_populates="file_expertise_entries")
