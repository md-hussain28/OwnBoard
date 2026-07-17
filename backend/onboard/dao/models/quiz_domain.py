from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class QuizDomain(AuditBase):
    """Org-scoped quiz topic domain (Policy, Holiday, …) assignable to doc packs."""

    __tablename__ = "quiz_domain"
    __id_prefix__ = "qdom"
    __table_args__ = (UniqueConstraint("org_id", "name", name="uq_quiz_domain_org_name"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    # Seeded defaults cannot be deleted; custom domains can.
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    organization: Mapped["Organization"] = relationship(back_populates="quiz_domains")
    doc_packs: Mapped[list["DocPack"]] = relationship(back_populates="domain")
