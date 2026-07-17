from sqlalchemy import select
from sqlalchemy.orm import selectinload

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.employee import Employee
from onboard.dao.models.project import Project, ProjectMember


class ProjectDAO(BaseDAO[Project]):
    model = Project

    async def list_for_org(self, org_id: str, limit: int = 200, offset: int = 0) -> list[Project]:
        result = await self.session.execute(
            select(Project)
            .where(Project.org_id == org_id)
            .options(selectinload(Project.repo))
            .order_by(Project.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, project_id: str) -> Project | None:
        result = await self.session.execute(
            select(Project)
            .where(Project.id == project_id, Project.org_id == org_id)
            .options(selectinload(Project.repo))
        )
        return result.scalar_one_or_none()


class ProjectMemberDAO(BaseDAO[ProjectMember]):
    model = ProjectMember

    async def list_for_project(self, project_id: str) -> list[ProjectMember]:
        result = await self.session.execute(
            select(ProjectMember)
            .where(ProjectMember.project_id == project_id)
            .options(selectinload(ProjectMember.employee).selectinload(Employee.domain))
            .order_by(ProjectMember.created_at.asc())
        )
        return list(result.scalars().all())

    async def list_employee_ids_for_project(self, project_id: str) -> set[str]:
        result = await self.session.execute(
            select(ProjectMember.employee_id).where(ProjectMember.project_id == project_id)
        )
        return set(result.scalars().all())

    async def list_project_ids_for_employee(self, org_id: str, employee_id: str) -> list[str]:
        result = await self.session.execute(
            select(ProjectMember.project_id).where(
                ProjectMember.org_id == org_id, ProjectMember.employee_id == employee_id
            )
        )
        return list(result.scalars().all())

    async def get_for_project_and_employee(self, project_id: str, employee_id: str) -> ProjectMember | None:
        result = await self.session.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id, ProjectMember.employee_id == employee_id
            )
        )
        return result.scalar_one_or_none()

    async def count_for_project(self, project_id: str) -> int:
        return len(await self.list_employee_ids_for_project(project_id))
