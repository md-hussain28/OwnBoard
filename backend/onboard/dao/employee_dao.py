from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.employee import Employee


class EmployeeDAO(BaseDAO[Employee]):
    model = Employee

    async def list_for_org(self, org_id: str) -> list[Employee]:
        result = await self.session.execute(select(Employee).where(Employee.org_id == org_id))
        return list(result.scalars().all())

    async def get_by_github_handle(self, github_handle: str) -> Employee | None:
        result = await self.session.execute(select(Employee).where(Employee.github_handle == github_handle))
        return result.scalar_one_or_none()
