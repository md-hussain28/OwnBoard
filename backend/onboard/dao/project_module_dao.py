from sqlalchemy import select
from sqlalchemy.orm import selectinload

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.project_module import (
    ProjectModule,
    ProjectModuleAssignment,
    ProjectModuleStatus,
    ProjectModuleType,
)


class ProjectModuleDAO(BaseDAO[ProjectModule]):
    model = ProjectModule

    async def list_for_project(self, project_id: str, *, active_only: bool = False) -> list[ProjectModule]:
        stmt = (
            select(ProjectModule)
            .where(ProjectModule.project_id == project_id)
            .options(selectinload(ProjectModule.type_links).selectinload(ProjectModuleType.function_type))
            .order_by(ProjectModule.sequence_order.asc(), ProjectModule.created_at.asc())
        )
        if active_only:
            stmt = stmt.where(ProjectModule.status == ProjectModuleStatus.active)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, module_id: str) -> ProjectModule | None:
        result = await self.session.execute(
            select(ProjectModule)
            .where(ProjectModule.id == module_id, ProjectModule.org_id == org_id)
            .options(selectinload(ProjectModule.type_links).selectinload(ProjectModuleType.function_type))
        )
        return result.scalar_one_or_none()


class ProjectModuleTypeDAO(BaseDAO[ProjectModuleType]):
    model = ProjectModuleType

    async def replace_for_module(self, org_id: str, module_id: str, function_type_ids: list[str]) -> None:
        """Idempotent full replace of a module's function-type tags."""
        existing = await self.session.execute(select(ProjectModuleType).where(ProjectModuleType.module_id == module_id))
        for link in existing.scalars().all():
            await self.session.delete(link)
        for ft_id in dict.fromkeys(function_type_ids):
            self.session.add(ProjectModuleType(org_id=org_id, module_id=module_id, function_type_id=ft_id))
        await self.session.commit()

    async def list_function_type_ids_for_module(self, module_id: str) -> set[str]:
        result = await self.session.execute(
            select(ProjectModuleType.function_type_id).where(ProjectModuleType.module_id == module_id)
        )
        return set(result.scalars().all())

    async def list_module_ids_for_function_type(self, function_type_id: str) -> set[str]:
        result = await self.session.execute(
            select(ProjectModuleType.module_id).where(ProjectModuleType.function_type_id == function_type_id)
        )
        return set(result.scalars().all())


class ProjectModuleAssignmentDAO(BaseDAO[ProjectModuleAssignment]):
    model = ProjectModuleAssignment

    async def list_for_module(self, module_id: str) -> list[ProjectModuleAssignment]:
        result = await self.session.execute(
            select(ProjectModuleAssignment).where(ProjectModuleAssignment.module_id == module_id)
        )
        return list(result.scalars().all())

    async def list_for_employee_in_project(
        self, org_id: str, project_id: str, employee_id: str
    ) -> list[ProjectModuleAssignment]:
        result = await self.session.execute(
            select(ProjectModuleAssignment)
            .join(ProjectModule, ProjectModule.id == ProjectModuleAssignment.module_id)
            .where(
                ProjectModuleAssignment.org_id == org_id,
                ProjectModuleAssignment.employee_id == employee_id,
                ProjectModule.project_id == project_id,
            )
            .options(selectinload(ProjectModuleAssignment.module))
        )
        return list(result.scalars().all())

    async def get_for_module_and_employee(self, module_id: str, employee_id: str) -> ProjectModuleAssignment | None:
        result = await self.session.execute(
            select(ProjectModuleAssignment).where(
                ProjectModuleAssignment.module_id == module_id,
                ProjectModuleAssignment.employee_id == employee_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_assigned_employee_ids(self, module_id: str) -> set[str]:
        result = await self.session.execute(
            select(ProjectModuleAssignment.employee_id).where(ProjectModuleAssignment.module_id == module_id)
        )
        return set(result.scalars().all())
