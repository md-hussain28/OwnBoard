"""Dev-facing project modules: authoring (admin/lead), per-member views, and progress tracking.

Modules are typed, function-targeted ramp-up content that does NOT gate project access (unlike
tracks). Activating a module or changing its audience fans it out via the module auto-assigner.
"""

from datetime import UTC, datetime

from onboard.api.schema.project.response import ProjectModuleResponse
from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError, ValidationError
from onboard.dao.models.employee import Employee
from onboard.dao.models.project_module import ProjectModuleAssignmentStatus, ProjectModuleStatus
from onboard.services.project.base import ProjectServiceBase
from onboard.services.project.module_assign import assign_module_to_audience


class ProjectModuleMixin(ProjectServiceBase):
    async def list_modules(self, org_id: str, project_id: str, viewer: Employee) -> list[ProjectModuleResponse]:
        project = await self._get_project(org_id, project_id)
        is_admin = viewer.app_role == APP_ROLE_ADMIN
        membership = await self.member_dao.get_for_project_and_employee(project_id, viewer.id)
        if not is_admin and membership is None:
            raise ForbiddenError("You are not a member of this project")
        can_manage = is_admin or (membership is not None and membership.is_lead)
        return await self._modules_for_viewer(org_id, project.id, viewer, can_manage=can_manage)

    async def create_module(
        self,
        org_id: str,
        project_id: str,
        viewer: Employee,
        *,
        name: str,
        description: str | None,
        content: str | None,
        resource_links: list | None,
        function_type_ids: list[str] | None,
        sequence_order: int,
        estimated_minutes: int | None,
        status: str | None,
        created_by: str | None,
    ) -> ProjectModuleResponse:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        cleaned = " ".join(name.split()).strip()
        if not cleaned:
            raise ValidationError("Module name cannot be empty")
        ft_ids = list(dict.fromkeys(function_type_ids or []))
        await self._validate_function_type_ids(project_id, ft_ids)
        try:
            module_status = ProjectModuleStatus(status) if status else ProjectModuleStatus.draft
        except ValueError as exc:
            raise ValidationError(f"Invalid module status: {status}") from exc

        module = await self.module_dao.create(
            org_id=org_id,
            project_id=project_id,
            name=cleaned,
            description=description,
            content=content,
            resource_links=self._dump_links(resource_links) or [],
            sequence_order=sequence_order,
            estimated_minutes=estimated_minutes,
            status=module_status,
            created_by=created_by,
        )
        if ft_ids:
            await self.module_type_dao.replace_for_module(org_id, module.id, ft_ids)
        if module_status == ProjectModuleStatus.active:
            await assign_module_to_audience(self.session, org_id, module.id)
        module = await self._get_module(org_id, project_id, module.id)
        assigned = await self.module_assignment_dao.list_assigned_employee_ids(module.id)
        return self._module_response(module, assigned_count=len(assigned))

    async def update_module(
        self,
        org_id: str,
        project_id: str,
        module_id: str,
        viewer: Employee,
        *,
        name: str | None = None,
        description: str | None = None,
        content: str | None = None,
        resource_links: list | None = None,
        function_type_ids: list[str] | None = None,
        sequence_order: int | None = None,
        estimated_minutes: int | None = None,
        status: str | None = None,
    ) -> ProjectModuleResponse:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        module = await self._get_module(org_id, project_id, module_id)

        fields: dict = {}
        if name is not None:
            cleaned = " ".join(name.split()).strip()
            if not cleaned:
                raise ValidationError("Module name cannot be empty")
            fields["name"] = cleaned
        if description is not None:
            fields["description"] = description
        if content is not None:
            fields["content"] = content
        if resource_links is not None:
            fields["resource_links"] = self._dump_links(resource_links)
        if sequence_order is not None:
            fields["sequence_order"] = sequence_order
        if estimated_minutes is not None:
            fields["estimated_minutes"] = estimated_minutes
        became_active = False
        if status is not None:
            try:
                new_status = ProjectModuleStatus(status)
            except ValueError as exc:
                raise ValidationError(f"Invalid module status: {status}") from exc
            became_active = new_status == ProjectModuleStatus.active and module.status != ProjectModuleStatus.active
            fields["status"] = new_status
        if fields:
            await self.module_dao.update(module.id, **fields)
        types_changed = False
        if function_type_ids is not None:
            ft_ids = list(dict.fromkeys(function_type_ids))
            await self._validate_function_type_ids(project_id, ft_ids)
            await self.module_type_dao.replace_for_module(org_id, module.id, ft_ids)
            types_changed = True

        module = await self._get_module(org_id, project_id, module.id)
        # Re-run auto-assign when it just became active or its audience (types) changed while active.
        if became_active or (types_changed and module.status == ProjectModuleStatus.active):
            await assign_module_to_audience(self.session, org_id, module.id)
        module = await self._get_module(org_id, project_id, module.id)
        assigned = await self.module_assignment_dao.list_assigned_employee_ids(module.id)
        return self._module_response(module, assigned_count=len(assigned))

    async def delete_module(self, org_id: str, project_id: str, module_id: str, viewer: Employee) -> None:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        module = await self._get_module(org_id, project_id, module_id)
        await self.module_dao.delete(module.id)

    async def set_module_progress(
        self, org_id: str, project_id: str, module_id: str, viewer: Employee, *, status: str
    ) -> ProjectModuleResponse:
        """A member updates their own progress on a module (in_progress / completed)."""
        await self._get_project(org_id, project_id)
        module = await self._get_module(org_id, project_id, module_id)
        assignment = await self.module_assignment_dao.get_for_module_and_employee(module_id, viewer.id)
        if assignment is None:
            raise ForbiddenError("This module is not assigned to you")
        try:
            parsed = ProjectModuleAssignmentStatus(status)
        except ValueError as exc:
            raise ValidationError(f"Invalid module progress status: {status}") from exc
        completed_at = datetime.now(UTC) if parsed == ProjectModuleAssignmentStatus.completed else None
        await self.module_assignment_dao.update(assignment.id, status=parsed, completed_at=completed_at)
        module = await self._get_module(org_id, project_id, module_id)
        refreshed = await self.module_assignment_dao.get_for_module_and_employee(module_id, viewer.id)
        return self._module_response(module, my_assignment=refreshed)
