from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class Repo(AuditBase):
    __tablename__ = "repo"

    url: Mapped[str] = mapped_column(String(512), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contributors: Mapped[list["Contributor"]] = relationship(back_populates="repo", cascade="all, delete-orphan")
    file_expertise_entries: Mapped[list["FileExpertise"]] = relationship(
        back_populates="repo", cascade="all, delete-orphan"
    )
    commit_records: Mapped[list["CommitRecord"]] = relationship(back_populates="repo", cascade="all, delete-orphan")
    code_chunks: Mapped[list["CodeChunk"]] = relationship(back_populates="repo", cascade="all, delete-orphan")
