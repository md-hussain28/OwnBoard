from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from onboard.dao.models.base import AuditBase


class PolicyDoc(AuditBase):
    __tablename__ = "policy_doc"

    org_id: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
