"""In-app notifications (Track PRD §notifications).

Delivery is in-app only — the frontend bell polls `list` / `unread-count`; there is no email. Two of the
four notification types are *lazily materialized* on read instead of pushed at event time, which keeps us
off a scheduler (the host is a 512MB free-tier box, so a cron worker isn't worth it):

- `assignment` / `outcome` — emitted eagerly at the moment the event happens (assign, quiz graded).
- `overdue` — created when the recipient polls and has an assignment past its due date (deduped per assignment).
- `digest` — created once per day for admins, summarizing stalled onboarding across the org.
"""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import APP_ROLE_ADMIN
from onboard.dao.models.employee import Employee
from onboard.dao.models.notification import Notification, NotificationType
from onboard.dao.notification_dao import NotificationDAO
from onboard.dao.pack_assignment_dao import PackAssignmentDAO


class NotificationService:
    """Create and read in-app notifications for onboarding events (Track PRD §notifications)."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.dao = NotificationDAO(session)
        self.assignment_dao = PackAssignmentDAO(session)

    async def emit(
        self,
        org_id: str,
        employee_id: str,
        type_: NotificationType,
        title: str,
        *,
        body: str | None = None,
        link: str | None = None,
    ) -> Notification:
        return await self.dao.create(
            org_id=org_id,
            employee_id=employee_id,
            type=type_,
            title=title,
            body=body,
            link=link,
        )

    async def _materialize_overdue(self, org_id: str, employee_id: str, now: datetime) -> None:
        overdue = await self.assignment_dao.list_overdue_for_employee(org_id, employee_id, now)
        for assignment in overdue:
            link = f"/app/onboarding/packs/{assignment.id}"
            if await self.dao.exists_of_type_with_link(employee_id, NotificationType.overdue, link):
                continue
            name = assignment.doc_pack.name if assignment.doc_pack else "a track"
            await self.emit(
                org_id,
                employee_id,
                NotificationType.overdue,
                f"Overdue: {name}",
                body="This onboarding track is past its due date. Finish it to stay on track.",
                link=link,
            )

    async def _materialize_admin_digest(self, org_id: str, employee_id: str, now: datetime) -> None:
        stalled = await self.assignment_dao.count_stalled_for_org(org_id, now)
        if stalled <= 0:
            return
        # One digest per day: fold the date into the dedupe link so tomorrow's digest is a fresh row.
        link = f"/app/tracks?digest={now.date().isoformat()}"
        if await self.dao.exists_of_type_with_link(employee_id, NotificationType.digest, link):
            return
        await self.emit(
            org_id,
            employee_id,
            NotificationType.digest,
            f"{stalled} onboarding {'track' if stalled == 1 else 'tracks'} need attention",
            body="Some hires haven't started or are overdue on their assigned tracks.",
            link=link,
        )

    async def list_for_employee(self, org_id: str, actor: Employee, *, limit: int = 30) -> list[Notification]:
        now = datetime.now(UTC)
        await self._materialize_overdue(org_id, actor.id, now)
        if actor.app_role == APP_ROLE_ADMIN:
            await self._materialize_admin_digest(org_id, actor.id, now)
        return await self.dao.list_for_employee(org_id, actor.id, limit=limit)

    async def unread_count(self, org_id: str, actor: Employee) -> int:
        now = datetime.now(UTC)
        await self._materialize_overdue(org_id, actor.id, now)
        if actor.app_role == APP_ROLE_ADMIN:
            await self._materialize_admin_digest(org_id, actor.id, now)
        return await self.dao.unread_count(org_id, actor.id)

    async def mark_read(self, org_id: str, actor: Employee, notification_id: str) -> None:
        await self.dao.mark_read(org_id, actor.id, notification_id)

    async def mark_all_read(self, org_id: str, actor: Employee) -> None:
        await self.dao.mark_all_read(org_id, actor.id)
