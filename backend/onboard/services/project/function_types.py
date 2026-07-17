"""Project function types — the role buckets (e.g. Frontend, Backend) that target ramp-up modules."""

from onboard.api.schema.project.response import ProjectFunctionTypeResponse
from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.dao.models.employee import Employee
from onboard.services.project.base import ProjectServiceBase


class ProjectFunctionTypeMixin(ProjectServiceBase):
    async def list_function_types(
        self, org_id: str, project_id: str, viewer: Employee
    ) -> list[ProjectFunctionTypeResponse]:
        project = await self._get_project(org_id, project_id)
        if viewer.app_role != APP_ROLE_ADMIN:
            if await self.member_dao.get_for_project_and_employee(project_id, viewer.id) is None:
                raise ForbiddenError("You are not a member of this project")
        return await self._function_types(project.id)

    async def create_function_type(
        self, org_id: str, project_id: str, viewer: Employee, *, name: str, sort_order: int
    ) -> ProjectFunctionTypeResponse:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        cleaned = " ".join(name.split()).strip()
        if not cleaned:
            raise ValidationError("Function type name cannot be empty")
        for existing in await self.function_type_dao.list_for_project(project_id):
            if existing.name.lower() == cleaned.lower():
                raise ValidationError(f"Function type '{cleaned}' already exists")
        ft = await self.function_type_dao.create(
            org_id=org_id, project_id=project_id, name=cleaned, sort_order=sort_order
        )
        return ProjectFunctionTypeResponse(id=ft.id, name=ft.name, sort_order=ft.sort_order)

    async def update_function_type(
        self,
        org_id: str,
        project_id: str,
        function_type_id: str,
        viewer: Employee,
        *,
        name: str | None,
        sort_order: int | None,
    ) -> ProjectFunctionTypeResponse:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        ft = await self.function_type_dao.get_by_id_for_project(project_id, function_type_id)
        if ft is None:
            raise NotFoundError(f"Function type {function_type_id} not found")
        fields: dict = {}
        if name is not None:
            cleaned = " ".join(name.split()).strip()
            if not cleaned:
                raise ValidationError("Function type name cannot be empty")
            fields["name"] = cleaned
        if sort_order is not None:
            fields["sort_order"] = sort_order
        if fields:
            await self.function_type_dao.update(ft.id, **fields)
        ft = await self.function_type_dao.get_by_id_for_project(project_id, function_type_id)
        if ft is None:
            raise NotFoundError(f"Function type {function_type_id} not found")
        return ProjectFunctionTypeResponse(id=ft.id, name=ft.name, sort_order=ft.sort_order)

    async def delete_function_type(self, org_id: str, project_id: str, function_type_id: str, viewer: Employee) -> None:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        ft = await self.function_type_dao.get_by_id_for_project(project_id, function_type_id)
        if ft is None:
            raise NotFoundError(f"Function type {function_type_id} not found")
        # FK ondelete=SET NULL on members / CASCADE on module type links keeps rows consistent.
        await self.function_type_dao.delete(ft.id)
