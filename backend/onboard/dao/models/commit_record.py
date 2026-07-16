from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class CommitRecord(AuditBase):
    __tablename__ = "commit_record"

    repo_id: Mapped[str] = mapped_column(ForeignKey("repo.id", ondelete="CASCADE"), nullable=False)
    hash: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[str] = mapped_column(ForeignKey("contributor.id", ondelete="CASCADE"), nullable=False)
    committed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    linked_issue: Mapped[str | None] = mapped_column(String(255), nullable=True)

    repo: Mapped["Repo"] = relationship(back_populates="commit_records")
    author: Mapped["Contributor"] = relationship(back_populates="commit_records")
