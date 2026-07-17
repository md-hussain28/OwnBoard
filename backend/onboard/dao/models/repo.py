from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.code_chunk import CodeChunk
    from onboard.dao.models.commit_record import CommitRecord
    from onboard.dao.models.contributor import Contributor
    from onboard.dao.models.file_expertise import FileExpertise
    from onboard.dao.models.organization import Organization
    from onboard.dao.models.project import Project


class Repo(AuditBase):
    __tablename__ = "repo"
    __id_prefix__ = "repo"

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="repos")
    contributors: Mapped[list["Contributor"]] = relationship(back_populates="repo", cascade="all, delete-orphan")
    file_expertise_entries: Mapped[list["FileExpertise"]] = relationship(
        back_populates="repo", cascade="all, delete-orphan"
    )
    commit_records: Mapped[list["CommitRecord"]] = relationship(back_populates="repo", cascade="all, delete-orphan")
    code_chunks: Mapped[list["CodeChunk"]] = relationship(back_populates="repo", cascade="all, delete-orphan")
    # Projects linking to this repo; repo delete sets project.repo_id NULL (SET NULL), it does not delete them.
    projects: Mapped[list["Project"]] = relationship(back_populates="repo")
