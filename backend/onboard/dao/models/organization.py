from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class Organization(AuditBase):
    """A Clerk Organization. `id` is the Clerk org id itself (e.g. `org_...`), not a generated one — every
    other tenant-owned table's `org_id` column is a foreign key into this table's `id`."""

    __tablename__ = "organization"

    # Clerk supplies the id verbatim — no default generator, insertion without an explicit id must fail.
    id: Mapped[str] = mapped_column(String(64), primary_key=True)

    name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    employees: Mapped[list["Employee"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    domains: Mapped[list["OrgDomain"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    quiz_domains: Mapped[list["QuizDomain"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    repos: Mapped[list["Repo"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    policy_docs: Mapped[list["PolicyDoc"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    doc_packs: Mapped[list["DocPack"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
