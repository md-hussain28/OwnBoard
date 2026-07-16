from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.employee import Employee


class EmployeeService:
    """Employee registration CRUD, scoped to the caller's active organization (PRD §3)."""

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
        return await self.employee_dao.list_for_org(org_id, limit=limit, offset=offset)
