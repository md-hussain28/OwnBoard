from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.commit_record import CommitRecord
    from onboard.dao.models.expertise_availability import ExpertiseAvailability
    from onboard.dao.models.file_expertise import FileExpertise
    from onboard.dao.models.institutional_memory_note import InstitutionalMemoryNote
    from onboard.dao.models.repo import Repo


class Contributor(AuditBase):
    __tablename__ = "contributor"
    __id_prefix__ = "ctrb"

    repo_id: Mapped[str] = mapped_column(ForeignKey("repo.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_handle: Mapped[str | None] = mapped_column(String(255), nullable=True)

    repo: Mapped["Repo"] = relationship(back_populates="contributors")
    file_expertise_entries: Mapped[list["FileExpertise"]] = relationship(
        back_populates="contributor", cascade="all, delete-orphan", passive_deletes=True
    )
    commit_records: Mapped[list["CommitRecord"]] = relationship(
        back_populates="author", cascade="all, delete-orphan", passive_deletes=True
    )
    availability: Mapped["ExpertiseAvailability | None"] = relationship(
        back_populates="contributor", cascade="all, delete-orphan", uselist=False, passive_deletes=True
    )
    institutional_memory_notes: Mapped[list["InstitutionalMemoryNote"]] = relationship(
        back_populates="contributor", cascade="all, delete-orphan", passive_deletes=True
    )
