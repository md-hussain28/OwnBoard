import logging

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.clerk.client import get_clerk_client
from onboard.core.common.exceptions import NotFoundError
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.employee import Employee

logger = logging.getLogger(__name__)


def _member_display_name(
    first_name: str | None,
    last_name: str | None,
    identifier: str | None,
    username: str | None,
    user_id: str,
) -> str:
    full = " ".join(part for part in (first_name, last_name) if part).strip()
    if full:
        return full
    if identifier:
        return identifier
    if username:
        return username
    return user_id


class EmployeeService:
    """Employee registration CRUD, scoped to the caller's active organization (PRD §3).

    List also lazily syncs Clerk organization memberships into `employee` rows so
    Assign UIs see org members without a separate webhook receiver.
    """

    def __init__(self, session: AsyncSession):
        self.employee_dao = EmployeeDAO(session)

    async def create_employee(self, org_id: str, name: str, role: str | None, github_handle: str | None) -> Employee:
        return await self.employee_dao.create(org_id=org_id, name=name, role=role, github_handle=github_handle)

    async def get_employee(self, org_id: str, employee_id: str) -> Employee:
        employee = await self.employee_dao.get_by_id_for_org(org_id, employee_id)
        if employee is None:
            raise NotFoundError(f"Employee {employee_id} not found")
        return employee

    async def list_employees(self, org_id: str, limit: int = 100, offset: int = 0) -> list[Employee]:
        await self.sync_org_members_from_clerk(org_id)
        return await self.employee_dao.list_for_org(org_id, limit=limit, offset=offset)

    async def sync_org_members_from_clerk(self, org_id: str) -> int:
        """Upsert Clerk organization members as employees. Returns upserted count.

        Soft-fails (logs + returns 0) if Clerk is unreachable so list still works
        for manually created employees.
        """
        try:
            clerk = get_clerk_client()
        except RuntimeError as exc:
            logger.warning("Skipping Clerk member sync: %s", exc)
            return 0

        upserted = 0
        offset = 0
        page_size = 100

        try:
            while True:
                page = await clerk.organization_memberships.list_async(
                    organization_id=org_id,
                    limit=page_size,
                    offset=offset,
                )
                memberships = page.data or []
                if not memberships:
                    break

                for membership in memberships:
                    public_user = membership.public_user_data
                    if public_user is None or not public_user.user_id:
                        continue

                    clerk_user_id = public_user.user_id
                    name = _member_display_name(
                        public_user.first_name,
                        public_user.last_name,
                        public_user.identifier,
                        public_user.username,
                        clerk_user_id,
                    )
                    role = membership.role

                    existing = await self.employee_dao.get_by_clerk_user_id(org_id, clerk_user_id)
                    if existing is None:
                        await self.employee_dao.create(
                            org_id=org_id,
                            clerk_user_id=clerk_user_id,
                            name=name,
                            role=role,
                            github_handle=None,
                        )
                        upserted += 1
                    elif existing.name != name or existing.role != role:
                        await self.employee_dao.update(existing.id, name=name, role=role)
                        upserted += 1

                if len(memberships) < page_size:
                    break
                offset += page_size
        except Exception:
            logger.exception("Clerk organization member sync failed for org %s", org_id)
            return upserted

        return upserted
