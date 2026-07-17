from sqlalchemy import func, select, update

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.notification import Notification, NotificationType


class NotificationDAO(BaseDAO[Notification]):
    model = Notification

    async def list_for_employee(self, org_id: str, employee_id: str, *, limit: int = 30) -> list[Notification]:
        result = await self.session.execute(
            select(Notification)
            .where(Notification.org_id == org_id, Notification.employee_id == employee_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def unread_count(self, org_id: str, employee_id: str) -> int:
        result = await self.session.execute(
            select(func.count(Notification.id)).where(
                Notification.org_id == org_id,
                Notification.employee_id == employee_id,
                Notification.read_at.is_(None),
            )
        )
        return int(result.scalar_one())

    async def exists_of_type_with_link(self, employee_id: str, type_: NotificationType, link: str) -> bool:
        """Dedupe guard for lazily-materialized notifications (overdue/digest) so a poll doesn't spam."""
        result = await self.session.execute(
            select(Notification.id).where(
                Notification.employee_id == employee_id,
                Notification.type == type_,
                Notification.link == link,
            )
        )
        return result.first() is not None

    async def mark_read(self, org_id: str, employee_id: str, notification_id: str) -> None:
        await self.session.execute(
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.org_id == org_id,
                Notification.employee_id == employee_id,
            )
            .values(read_at=func.now())
        )
        await self.session.commit()

    async def mark_all_read(self, org_id: str, employee_id: str) -> None:
        await self.session.execute(
            update(Notification)
            .where(
                Notification.org_id == org_id,
                Notification.employee_id == employee_id,
                Notification.read_at.is_(None),
            )
            .values(read_at=func.now())
        )
        await self.session.commit()
