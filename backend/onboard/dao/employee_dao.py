from sqlalchemy import func, select

from onboard.config.constants import APP_ROLE_ADMIN
from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.employee import Employee


class EmployeeDAO(BaseDAO[Employee]):
    model = Employee

    async def list_for_org(self, org_id: str, limit: int = 100, offset: int = 0) -> list[Employee]:
        result = await self.session.execute(
            select(Employee).where(Employee.org_id == org_id).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, employee_id: str) -> Employee | None:
        result = await self.session.execute(
            select(Employee).where(Employee.id == employee_id, Employee.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_by_github_handle(self, org_id: str, github_handle: str) -> Employee | None:
        result = await self.session.execute(
            select(Employee).where(Employee.org_id == org_id, Employee.github_handle == github_handle)
        )
        return result.scalar_one_or_none()

    async def get_by_clerk_user_id(self, org_id: str, clerk_user_id: str) -> Employee | None:
        result = await self.session.execute(
            select(Employee).where(Employee.org_id == org_id, Employee.clerk_user_id == clerk_user_id)
        )
        return result.scalar_one_or_none()

    async def count_admins(self, org_id: str) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(Employee)
            .where(Employee.org_id == org_id, Employee.app_role == APP_ROLE_ADMIN)
        )
        return int(result.scalar_one())
