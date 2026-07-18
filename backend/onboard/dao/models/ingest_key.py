from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from onboard.dao.models.base import AuditBase


class IngestKey(AuditBase):
    """Per-repo API key authenticating the customer's GitHub Action to `POST /ingest`.

    Deliberately outside Clerk auth: the Action isn't a browser session, so it presents this
    bearer token instead. We store only the SHA-256 (`key_hash`) — never the plaintext. Both
    `org_id` and `repo_id` are captured so the ingest endpoint can resolve tenancy straight from
    the key without trusting any client-supplied field.
    """

    __tablename__ = "ingest_key"
    __id_prefix__ = "ingk"

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    repo_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("repo.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
