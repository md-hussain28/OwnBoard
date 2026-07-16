from datetime import datetime
from typing import ClassVar

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column

from onboard.core.common.ids import typed_id


class AuditBase(DeclarativeBase):
    """Shared base for all ORM models: typed string id pk + created_at/updated_at.

    Every model must set `__id_prefix__` (e.g. "doc") so its primary keys read
    `doc_<uuid7-hex>` — self-describing and time-ordered. `Organization` overrides
    the default entirely because its id is the Clerk org id verbatim.
    """

    __id_prefix__: ClassVar[str]

    @declared_attr
    def id(cls) -> Mapped[str]:  # noqa: N805
        prefix = cls.__id_prefix__
        return mapped_column(String(64), primary_key=True, default=lambda: typed_id(prefix))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    @classmethod
    def generate_pk(cls) -> str:
        """Pre-generate a primary key (e.g. when the id is needed for a storage path before insert)."""
        return typed_id(cls.__id_prefix__)
