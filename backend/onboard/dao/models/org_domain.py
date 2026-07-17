from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase

if TYPE_CHECKING:
    from onboard.dao.models.employee import Employee
    from onboard.dao.models.organization import Organization


class OrgDomain(AuditBase):
    """Org-scoped work domain (Developer, Marketing, …) assignable to employees."""

    __tablename__ = "org_domain"
    __id_prefix__ = "dom"
    __table_args__ = (UniqueConstraint("org_id", "name", name="uq_org_domain_org_name"),)

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    # Seeded defaults cannot be deleted; custom domains can.
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    organization: Mapped["Organization"] = relationship(back_populates="domains")
    employees: Mapped[list["Employee"]] = relationship(back_populates="domain")
