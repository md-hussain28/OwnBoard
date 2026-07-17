import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.dao.models.base import AuditBase


class NotificationType(str, enum.Enum):
    """What a notification is about — drives the icon/tone the frontend renders."""

    assignment = "assignment"  # A new track was assigned to you.
    overdue = "overdue"  # An assigned track passed its due date.
    outcome = "outcome"  # You passed/failed a quiz.
    digest = "digest"  # Admin summary (e.g. "3 hires haven't started").


class Notification(AuditBase):
    """In-app notification for one recipient (Track PRD §notifications). No email — polled by the UI bell."""

    __tablename__ = "notification"
    __id_prefix__ = "ntf"

    org_id: Mapped[str] = mapped_column(String(64), ForeignKey("organization.id"), nullable=False, index=True)
    # Recipient. For admin digests this is the admin employee id.
    employee_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("employee.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType, name="notification_type"), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    # In-app path the bell links to (e.g. `/app/onboarding/packs/asgn_...`). Never an external URL.
    link: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    employee: Mapped["Employee"] = relationship()
