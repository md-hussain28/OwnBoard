"""Projects — team/product spaces a hire is placed on (Projects PRD §1).

A project bundles: project-specific onboarding *tracks* (a member must pass every track before the
project unlocks for them — gating), dev-facing *modules* (typed, function-targeted ramp-up content that
does NOT gate), reference *context* (tech stack, links, glossary, repos), and its *members*.

Access:
- Org **admins** can manage every project and create/delete projects.
- A project's **team lead** (a member with `is_lead`) can do everything an admin can on *that* project
  (edit context, manage members/leads, author modules + function types), but nothing elsewhere.
- Plain **members** get a read-only context hub plus their own gate/module progress.
"""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.api.schema.project.response import (
    MyProjectResponse,
    ProjectDetailResponse,
    ProjectFunctionTypeResponse,
    ProjectMemberResponse,
    ProjectModuleResponse,
    ProjectReadiness,
    ProjectRepoResponse,
    ProjectResponse,
    ProjectTrackResponse,
)
from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.dao.doc_pack_dao import DocPackDAO
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.doc_pack import PackAssignment, PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.dao.models.project import Project, ProjectStatus
from onboard.dao.models.project_module import ProjectModuleAssignmentStatus, ProjectModuleStatus
from onboard.dao.pack_assignment_dao import PackAssignmentDAO
from onboard.dao.project_dao import (
    ProjectDAO,
    ProjectFunctionTypeDAO,
    ProjectMemberDAO,
    ProjectRepoDAO,
)
from onboard.dao.project_module_dao import (
    ProjectModuleAssignmentDAO,
    ProjectModuleDAO,
    ProjectModuleTypeDAO,
)
from onboard.dao.repo_dao import RepoDAO
from onboard.services.pack_assignment.auto_assign import assign_project_tracks_to_member
from onboard.services.project.module_assign import assign_module_to_audience, assign_modules_to_member


def _readiness(assignments: list[PackAssignment]) -> ProjectReadiness:
    """Derive a member's lock/progress from their assignments for one project's (published) tracks."""
    total = len(assignments)  # only published project tracks produce an assignment, so this is the gating set
    passed = sum(1 for a in assignments if a.status == PackAssignmentStatus.passed)
    in_progress = total - passed
    return ProjectReadiness(
        locked=passed < total,  # total == 0 → nothing to pass → unlocked
        total_tracks=total,
        passed_tracks=passed,
        in_progress_tracks=in_progress,
        progress_pct=round(passed / total * 100) if total else 100,
    )


class ProjectService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.project_dao = ProjectDAO(session)
        self.member_dao = ProjectMemberDAO(session)
        self.repo_link_dao = ProjectRepoDAO(session)
        self.function_type_dao = ProjectFunctionTypeDAO(session)
        self.module_dao = ProjectModuleDAO(session)
        self.module_type_dao = ProjectModuleTypeDAO(session)
        self.module_assignment_dao = ProjectModuleAssignmentDAO(session)
        self.pack_dao = DocPackDAO(session)
        self.assignment_dao = PackAssignmentDAO(session)
        self.employee_dao = EmployeeDAO(session)
        self.repo_dao = RepoDAO(session)

    # ---- authorization -----------------------------------------------------

    async def _can_manage(self, project: Project, viewer: Employee) -> bool:
        """Org admin, or the team lead of this specific project."""
        if viewer.app_role == APP_ROLE_ADMIN:
            return True
        membership = await self.member_dao.get_for_project_and_employee(project.id, viewer.id)
        return membership is not None and membership.is_lead

    async def _assert_can_manage(self, project: Project, viewer: Employee) -> None:
        if not await self._can_manage(project, viewer):
            raise ForbiddenError("Only an admin or this project's team lead can manage it")

    # ---- response builders -------------------------------------------------

    def _repos(self, project: Project) -> list[ProjectRepoResponse]:
        return [
            ProjectRepoResponse(
                repo_id=link.repo_id,
                name=link.repo.name if link.repo else None,
                url=link.repo.url if link.repo else None,
                is_primary=link.is_primary,
            )
            for link in project.repos
        ]

    async def _base_response(self, project: Project) -> ProjectResponse:
        member_count = await self.member_dao.count_for_project(project.id)
        track_count = len(await self.pack_dao.list_for_project(project.org_id, project.id))
        module_count = len(await self.module_dao.list_for_project(project.id))
        return ProjectResponse(
            id=project.id,
            org_id=project.org_id,
            name=project.name,
            description=project.description,
            status=project.status.value,
            repo_id=project.repo_id,
            repo_name=project.repo.name if project.repo else None,
            repos=self._repos(project),
            tech_stack=project.tech_stack or [],
            resource_links=project.resource_links or [],
            glossary=project.glossary or [],
            created_by=project.created_by,
            created_at=project.created_at,
            updated_at=project.updated_at,
            member_count=member_count,
            track_count=track_count,
            module_count=module_count,
        )

    async def _function_types(self, project_id: str) -> list[ProjectFunctionTypeResponse]:
        types = await self.function_type_dao.list_for_project(project_id)
        members = await self.member_dao.list_for_project(project_id)
        member_counts: dict[str, int] = {}
        for m in members:
            if m.function_type_id:
                member_counts[m.function_type_id] = member_counts.get(m.function_type_id, 0) + 1
        rows: list[ProjectFunctionTypeResponse] = []
        for t in types:
            module_ids = await self.module_type_dao.list_module_ids_for_function_type(t.id)
            rows.append(
                ProjectFunctionTypeResponse(
                    id=t.id,
                    name=t.name,
                    sort_order=t.sort_order,
                    member_count=member_counts.get(t.id, 0),
                    module_count=len(module_ids),
                )
            )
        return rows

    def _module_response(self, module, *, my_assignment=None, assigned_count: int = 0) -> ProjectModuleResponse:
        type_ids = [link.function_type_id for link in module.type_links]
        type_names = [link.function_type.name for link in module.type_links if link.function_type]
        my_status = my_assignment.status.value if my_assignment else "not_assigned"
        return ProjectModuleResponse(
            id=module.id,
            name=module.name,
            description=module.description,
            content=module.content,
            resource_links=module.resource_links or [],
            status=module.status.value,
            sequence_order=module.sequence_order,
            estimated_minutes=module.estimated_minutes,
            function_type_ids=type_ids,
            function_type_names=type_names,
            assigned_count=assigned_count,
            my_status=my_status,
            my_completed=my_status == ProjectModuleAssignmentStatus.completed.value,
        )

    # ---- CRUD --------------------------------------------------------------

    async def _validate_repo(self, org_id: str, repo_id: str | None) -> None:
        if repo_id is None:
            return
        if await self.repo_dao.get_by_id_for_org(org_id, repo_id) is None:
            raise ValidationError(f"Repo {repo_id} not found")

    @staticmethod
    def _dump_links(links) -> list | None:
        if links is None:
            return None
        return [item.model_dump() if hasattr(item, "model_dump") else item for item in links]

    async def create_project(
        self,
        org_id: str,
        name: str,
        description: str | None,
        repo_id: str | None,
        created_by: str | None,
        *,
        tech_stack: list[str] | None = None,
        resource_links: list | None = None,
        glossary: list | None = None,
    ) -> ProjectResponse:
        cleaned = " ".join(name.split()).strip()
        if not cleaned:
            raise ValidationError("Project name cannot be empty")
        await self._validate_repo(org_id, repo_id)
        project = await self.project_dao.create(
            org_id=org_id,
            name=cleaned,
            description=description,
            repo_id=repo_id,
            created_by=created_by,
            tech_stack=tech_stack or [],
            resource_links=self._dump_links(resource_links) or [],
            glossary=self._dump_links(glossary) or [],
        )
        if repo_id is not None:
            await self.repo_link_dao.create(
                org_id=org_id, project_id=project.id, repo_id=repo_id, is_primary=True, added_by=created_by
            )
        project = await self.project_dao.get_by_id_for_org(org_id, project.id)
        return await self._base_response(project)

    async def list_projects(self, org_id: str) -> list[ProjectResponse]:
        projects = await self.project_dao.list_for_org(org_id)
        return [await self._base_response(p) for p in projects]

    async def _get_project(self, org_id: str, project_id: str) -> Project:
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")
        return project

    async def update_project(
        self,
        org_id: str,
        project_id: str,
        viewer: Employee,
        *,
        name: str | None = None,
        description: str | None = None,
        repo_id: str | None = None,
        clear_repo: bool = False,
        status: str | None = None,
        tech_stack: list[str] | None = None,
        resource_links: list | None = None,
        glossary: list | None = None,
    ) -> ProjectResponse:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        fields: dict = {}
        if name is not None:
            cleaned = " ".join(name.split()).strip()
            if not cleaned:
                raise ValidationError("Project name cannot be empty")
            fields["name"] = cleaned
        if description is not None:
            fields["description"] = description
        if clear_repo:
            fields["repo_id"] = None
        elif repo_id is not None:
            await self._validate_repo(org_id, repo_id)
            fields["repo_id"] = repo_id
        if status is not None:
            try:
                fields["status"] = ProjectStatus(status)
            except ValueError as exc:
                raise ValidationError(f"Invalid project status: {status}") from exc
        if tech_stack is not None:
            fields["tech_stack"] = tech_stack
        if resource_links is not None:
            fields["resource_links"] = self._dump_links(resource_links)
        if glossary is not None:
            fields["glossary"] = self._dump_links(glossary)
        if fields:
            await self.project_dao.update(project.id, **fields)
        project = await self._get_project(org_id, project_id)
        return await self._base_response(project)

    async def delete_project(self, org_id: str, project_id: str) -> None:
        # Deleting a project stays admin-only — enforced by the router's RequireAdmin gate.
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")
        await self.project_dao.delete(project.id)

    # ---- repos -------------------------------------------------------------

    async def add_repo(
        self,
        org_id: str,
        project_id: str,
        viewer: Employee,
        *,
        repo_id: str | None,
        url: str | None,
        name: str | None,
        is_primary: bool,
        added_by: str | None,
    ) -> ProjectResponse:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)

        if repo_id is None:
            if not url or not url.strip():
                raise ValidationError("Provide a repo_id or a url to link")
            url = url.strip()
            existing = await self.repo_dao.get_by_url_for_org(org_id, url)
            if existing is not None:
                repo_id = existing.id
            else:
                repo = await self.repo_dao.create(org_id=org_id, url=url, name=(name or url).strip())
                repo_id = repo.id
        else:
            await self._validate_repo(org_id, repo_id)

        if await self.repo_link_dao.get_for_project_and_repo(project_id, repo_id) is None:
            await self.repo_link_dao.create(
                org_id=org_id, project_id=project_id, repo_id=repo_id, is_primary=is_primary, added_by=added_by
            )
        if is_primary:
            await self.project_dao.update(project_id, repo_id=repo_id)
        project = await self._get_project(org_id, project_id)
        return await self._base_response(project)

    async def remove_repo(self, org_id: str, project_id: str, repo_id: str, viewer: Employee) -> ProjectResponse:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        link = await self.repo_link_dao.get_for_project_and_repo(project_id, repo_id)
        if link is None:
            raise NotFoundError(f"Repo {repo_id} is not linked to project {project_id}")
        await self.repo_link_dao.delete(link.id)
        if project.repo_id == repo_id:
            await self.project_dao.update(project_id, repo_id=None)
        project = await self._get_project(org_id, project_id)
        return await self._base_response(project)

    # ---- function types ----------------------------------------------------

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
        return ProjectFunctionTypeResponse(id=ft.id, name=ft.name, sort_order=ft.sort_order)

    async def delete_function_type(self, org_id: str, project_id: str, function_type_id: str, viewer: Employee) -> None:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        ft = await self.function_type_dao.get_by_id_for_project(project_id, function_type_id)
        if ft is None:
            raise NotFoundError(f"Function type {function_type_id} not found")
        # FK ondelete=SET NULL on members / CASCADE on module type links keeps rows consistent.
        await self.function_type_dao.delete(ft.id)

    # ---- membership + readiness -------------------------------------------

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

    # ---- modules -----------------------------------------------------------

    async def _modules_for_viewer(
        self, org_id: str, project_id: str, viewer: Employee, *, can_manage: bool
    ) -> list[ProjectModuleResponse]:
        modules = await self.module_dao.list_for_project(project_id)
        if can_manage:
            rows: list[ProjectModuleResponse] = []
            for m in modules:
                assigned = await self.module_assignment_dao.list_assigned_employee_ids(m.id)
                rows.append(self._module_response(m, assigned_count=len(assigned)))
            return rows
        # Member view: only active modules assigned to them, annotated with their status.
        my_assignments = {
            a.module_id: a
            for a in await self.module_assignment_dao.list_for_employee_in_project(org_id, project_id, viewer.id)
        }
        rows = []
        for m in modules:
            if m.status != ProjectModuleStatus.active:
                continue
            a = my_assignments.get(m.id)
            if a is None:
                continue
            rows.append(self._module_response(m, my_assignment=a))
        return rows

    async def list_modules(self, org_id: str, project_id: str, viewer: Employee) -> list[ProjectModuleResponse]:
        project = await self._get_project(org_id, project_id)
        is_admin = viewer.app_role == APP_ROLE_ADMIN
        membership = await self.member_dao.get_for_project_and_employee(project_id, viewer.id)
        if not is_admin and membership is None:
            raise ForbiddenError("You are not a member of this project")
        can_manage = is_admin or (membership is not None and membership.is_lead)
        return await self._modules_for_viewer(org_id, project.id, viewer, can_manage=can_manage)

    async def _validate_function_type_ids(self, project_id: str, function_type_ids: list[str]) -> None:
        for ft_id in function_type_ids:
            if await self.function_type_dao.get_by_id_for_project(project_id, ft_id) is None:
                raise ValidationError(f"Function type {ft_id} not found in this project")

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
        module = await self.module_dao.get_by_id_for_org(org_id, module.id)
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
        module = await self.module_dao.get_by_id_for_org(org_id, module_id)
        if module is None or module.project_id != project_id:
            raise NotFoundError(f"Module {module_id} not found")

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

        module = await self.module_dao.get_by_id_for_org(org_id, module.id)
        # Re-run auto-assign when it just became active or its audience (types) changed while active.
        if became_active or (types_changed and module.status == ProjectModuleStatus.active):
            await assign_module_to_audience(self.session, org_id, module.id)
        module = await self.module_dao.get_by_id_for_org(org_id, module.id)
        assigned = await self.module_assignment_dao.list_assigned_employee_ids(module.id)
        return self._module_response(module, assigned_count=len(assigned))

    async def delete_module(self, org_id: str, project_id: str, module_id: str, viewer: Employee) -> None:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        module = await self.module_dao.get_by_id_for_org(org_id, module_id)
        if module is None or module.project_id != project_id:
            raise NotFoundError(f"Module {module_id} not found")
        await self.module_dao.delete(module.id)

    async def set_module_progress(
        self, org_id: str, project_id: str, module_id: str, viewer: Employee, *, status: str
    ) -> ProjectModuleResponse:
        """A member updates their own progress on a module (in_progress / completed)."""
        await self._get_project(org_id, project_id)
        module = await self.module_dao.get_by_id_for_org(org_id, module_id)
        if module is None or module.project_id != project_id:
            raise NotFoundError(f"Module {module_id} not found")
        assignment = await self.module_assignment_dao.get_for_module_and_employee(module_id, viewer.id)
        if assignment is None:
            raise ForbiddenError("This module is not assigned to you")
        try:
            parsed = ProjectModuleAssignmentStatus(status)
        except ValueError as exc:
            raise ValidationError(f"Invalid module progress status: {status}") from exc
        completed_at = datetime.now(UTC) if parsed == ProjectModuleAssignmentStatus.completed else None
        await self.module_assignment_dao.update(assignment.id, status=parsed, completed_at=completed_at)
        module = await self.module_dao.get_by_id_for_org(org_id, module_id)
        refreshed = await self.module_assignment_dao.get_for_module_and_employee(module_id, viewer.id)
        return self._module_response(module, my_assignment=refreshed)
