from sqlalchemy import select

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
