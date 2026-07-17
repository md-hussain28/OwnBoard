"""Shared bits for the manual and auto assignment paths (due-date snapshot + the 'you were assigned' nudge)."""

from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.dao.models.doc_pack import DocPack
from onboard.dao.models.notification import NotificationType
from onboard.services.notification.notification_service import NotificationService


def compute_due_at(pack: DocPack, now: datetime) -> datetime | None:
    """Snapshot a deadline from the track's `due_offset_days` policy at assign time (None = no due date)."""
    if pack.due_offset_days is None:
        return None
    return now + timedelta(days=pack.due_offset_days)


async def notify_assigned(
    session: AsyncSession, org_id: str, employee_id: str, pack: DocPack, assignment_id: str
) -> None:
    """Emit the in-app 'a new track was assigned to you' notification."""
    due = ""
    if pack.due_offset_days is not None:
        due = f" It's due in {pack.due_offset_days} day{'s' if pack.due_offset_days != 1 else ''}."
    await NotificationService(session).emit(
        org_id,
        employee_id,
        NotificationType.assignment,
        f"New track assigned: {pack.name}",
        body=f"You've been assigned the '{pack.name}' onboarding track.{due}",
        link=f"/app/onboarding/packs/{assignment_id}",
    )
