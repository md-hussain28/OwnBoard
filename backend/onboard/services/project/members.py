"""Project membership + readiness: the member roster, per-member gate progress, and the
member-facing project detail/track surfaces (Projects PRD §1)."""

from onboard.api.schema.project.response import (
    MyProjectResponse,
    ProjectDetailResponse,
    ProjectMemberResponse,
    ProjectTrackResponse,
)
from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.dao.models.doc_pack import PackAssignment, PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.services.pack_assignment.auto_assign import assign_project_tracks_to_member
from onboard.services.project.base import ProjectServiceBase, _readiness
from onboard.services.project.module_assign import assign_modules_to_member


class ProjectMemberMixin(ProjectServiceBase):
    async def list_my_projects(self, org_id: str, employee: Employee) -> list[MyProjectResponse]:
        """The member's own projects with their lock/progress on each (the 'My projects' surface)."""
        project_ids = set(await self.member_dao.list_project_ids_for_employee(org_id, employee.id))
        if not project_ids:
            return []
        assignments = await self.assignment_dao.list_for_employee(org_id, employee.id)
        by_project: dict[str, list[PackAssignment]] = {}
        for a in assignments:
            pid = a.doc_pack.project_id if a.doc_pack else None
            if pid in project_ids:
                by_project.setdefault(pid, []).append(a)

        out: list[MyProjectResponse] = []
        for project in await self.project_dao.list_for_org(org_id):
            if project.id not in project_ids:
                continue
            base = await self._base_response(project)
            out.append(MyProjectResponse(**base.model_dump(), readiness=_readiness(by_project.get(project.id, []))))
        return out

    async def get_project_detail(self, org_id: str, project_id: str, viewer: Employee) -> ProjectDetailResponse:
        project = await self._get_project(org_id, project_id)
        is_admin = viewer.app_role == APP_ROLE_ADMIN
        membership = await self.member_dao.get_for_project_and_employee(project_id, viewer.id)
        is_member = membership is not None
        my_is_lead = is_member and membership.is_lead
        can_manage = is_admin or my_is_lead
        if not is_admin and not is_member:
            raise ForbiddenError("You are not a member of this project")

        tracks = await self.pack_dao.list_for_project(org_id, project_id)
        viewer_assignments = {a.doc_pack_id: a for a in await self.assignment_dao.list_for_employee(org_id, viewer.id)}
        track_responses: list[ProjectTrackResponse] = []
        gating_for_viewer: list[PackAssignment] = []
        for pack in tracks:
            a = viewer_assignments.get(pack.id)
            if a is not None:
                gating_for_viewer.append(a)
            track_responses.append(
                ProjectTrackResponse(
                    id=pack.id,
                    name=pack.name,
                    description=pack.description,
                    status=pack.status.value,
                    sequence_order=pack.sequence_order,
                    estimated_minutes=pack.estimated_minutes,
                    due_offset_days=pack.due_offset_days,
                    assignment_id=a.id if a else None,
                    my_status=a.status.value if a else "not_assigned",
                    passed=a is not None and a.status == PackAssignmentStatus.passed,
                )
            )

        modules = await self._modules_for_viewer(org_id, project_id, viewer, can_manage=can_manage)
        my_readiness = _readiness(gating_for_viewer) if is_member else None
        base = await self._base_response(project)
        return ProjectDetailResponse(
            **base.model_dump(),
            repo_url=project.repo.url if project.repo else None,
            tracks=track_responses,
            function_types=await self._function_types(project.id),
            modules=modules,
            my_readiness=my_readiness,
            is_member=is_member,
            is_admin=is_admin,
            my_is_lead=my_is_lead,
            can_manage=can_manage,
            locked=my_readiness.locked if my_readiness else False,
        )

    async def list_project_members(self, org_id: str, project_id: str, viewer: Employee) -> list[ProjectMemberResponse]:
        project = await self._get_project(org_id, project_id)
        is_admin = viewer.app_role == APP_ROLE_ADMIN
        if not is_admin and await self.member_dao.get_for_project_and_employee(project_id, viewer.id) is None:
            raise ForbiddenError("You are not a member of this project")
        return await self._build_member_panel(org_id, project.id)

    async def _build_member_panel(self, org_id: str, project_id: str) -> list[ProjectMemberResponse]:
        members = await self.member_dao.list_for_project(project_id)
        assignments = await self.assignment_dao.list_for_project(org_id, project_id)
        by_employee: dict[str, list[PackAssignment]] = {}
        for a in assignments:
            by_employee.setdefault(a.employee_id, []).append(a)

        rows: list[ProjectMemberResponse] = []
        for m in members:
            emp = m.employee
            readiness = _readiness(by_employee.get(emp.id, []))
            rows.append(
                ProjectMemberResponse(
                    employee_id=emp.id,
                    name=emp.name,
                    role=emp.role,
                    app_role=emp.app_role,
                    github_handle=emp.github_handle,
                    domain_name=emp.domain.name if emp.domain else None,
                    is_lead=m.is_lead,
                    function_type_id=m.function_type_id,
                    function_type_name=m.function_type.name if m.function_type else None,
                    readiness=readiness,
                    is_go_to=readiness.total_tracks > 0 and not readiness.locked,
                )
            )
        # Leads first, then go-to people, then the rest by name.
        rows.sort(key=lambda r: (not r.is_lead, not r.is_go_to, r.name.lower()))
        return rows

    async def add_members(
        self,
        org_id: str,
        project_id: str,
        employee_ids: list[str],
        added_by: str | None,
        viewer: Employee,
        *,
        function_type_id: str | None = None,
    ) -> list[ProjectMemberResponse]:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        if function_type_id is not None:
            if await self.function_type_dao.get_by_id_for_project(project_id, function_type_id) is None:
                raise ValidationError(f"Function type {function_type_id} not found in this project")
        for employee_id in dict.fromkeys(employee_ids):  # de-dupe, preserve order
            employee = await self.employee_dao.get_by_id_for_org(org_id, employee_id)
            if employee is None:
                raise ValidationError(f"Employee {employee_id} not found")
            if employee.app_role == APP_ROLE_ADMIN:
                raise ValidationError("Admins can't be added as project members")
            if await self.member_dao.get_for_project_and_employee(project_id, employee_id) is not None:
                continue  # already a member — idempotent
            await self.member_dao.create(
                org_id=org_id,
                project_id=project_id,
                employee_id=employee_id,
                function_type_id=function_type_id,
                added_by=added_by,
            )
            # Fan out this project's published tracks (gating) and function-matched modules to the new member.
            await assign_project_tracks_to_member(self.session, org_id, project_id, employee_id)
            await assign_modules_to_member(self.session, org_id, project_id, employee_id)
        return await self._build_member_panel(org_id, project.id)

    async def update_member(
        self,
        org_id: str,
        project_id: str,
        employee_id: str,
        viewer: Employee,
        *,
        function_type_id: str | None = None,
        clear_function_type: bool = False,
        is_lead: bool | None = None,
    ) -> list[ProjectMemberResponse]:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        membership = await self.member_dao.get_for_project_and_employee(project_id, employee_id)
        if membership is None:
            raise NotFoundError(f"Employee {employee_id} is not a member of project {project_id}")

        fields: dict = {}
        function_changed = False
        if clear_function_type:
            fields["function_type_id"] = None
            function_changed = membership.function_type_id is not None
        elif function_type_id is not None:
            if await self.function_type_dao.get_by_id_for_project(project_id, function_type_id) is None:
                raise ValidationError(f"Function type {function_type_id} not found in this project")
            fields["function_type_id"] = function_type_id
            function_changed = membership.function_type_id != function_type_id
        if is_lead is not None:
            fields["is_lead"] = is_lead
        if fields:
            await self.member_dao.update(membership.id, **fields)
        if function_changed:
            # Additive: assign modules for the new function. (Existing assignments are left intact.)
            await assign_modules_to_member(self.session, org_id, project_id, employee_id)
        return await self._build_member_panel(org_id, project.id)

    async def remove_member(self, org_id: str, project_id: str, employee_id: str, viewer: Employee) -> None:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        membership = await self.member_dao.get_for_project_and_employee(project_id, employee_id)
        if membership is None:
            raise NotFoundError(f"Employee {employee_id} is not a member of project {project_id}")
        await self.member_dao.delete(membership.id)
        # Revoke the member's assignments for this project's tracks so their gate/readiness don't linger
        # (general/company tracks and other projects' tracks are untouched — the query is project-scoped).
        await self.assignment_dao.delete_for_project_and_employee(org_id, project_id, employee_id)

    async def list_project_tracks(self, org_id: str, project_id: str, viewer: Employee) -> list[ProjectTrackResponse]:
        detail = await self.get_project_detail(org_id, project_id, viewer)
        return detail.tracks
