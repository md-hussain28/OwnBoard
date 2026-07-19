"""Shared foundation for the project service: DAO wiring, authorization, lookups, and response
builders reused by every concern mixin (`crud`, `repos`, `function_types`, `members`, `modules`)."""

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.api.schema.project.response import (
    ProjectFunctionTypeResponse,
    ProjectModuleResponse,
    ProjectReadiness,
    ProjectRepoResponse,
    ProjectResponse,
    RepoAssignee,
)
from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.dao.doc_pack_dao import DocPackDAO, DocPackTargetDomainDAO, DocPackTargetRepoDAO
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.doc_pack import PackAssignment, PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.dao.models.project import Project
from onboard.dao.models.project_module import ProjectModule, ProjectModuleAssignmentStatus, ProjectModuleStatus
from onboard.dao.pack_assignment_dao import PackAssignmentDAO
from onboard.dao.project_dao import (
    ProjectDAO,
    ProjectFunctionTypeDAO,
    ProjectMemberDAO,
    ProjectRepoDAO,
    ProjectRepoMemberDAO,
)
from onboard.dao.project_module_dao import (
    ProjectModuleAssignmentDAO,
    ProjectModuleDAO,
    ProjectModuleTypeDAO,
)
from onboard.dao.repo_dao import RepoDAO


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


class ProjectServiceBase:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.project_dao = ProjectDAO(session)
        self.member_dao = ProjectMemberDAO(session)
        self.repo_link_dao = ProjectRepoDAO(session)
        self.repo_member_dao = ProjectRepoMemberDAO(session)
        self.function_type_dao = ProjectFunctionTypeDAO(session)
        self.module_dao = ProjectModuleDAO(session)
        self.module_type_dao = ProjectModuleTypeDAO(session)
        self.module_assignment_dao = ProjectModuleAssignmentDAO(session)
        self.pack_dao = DocPackDAO(session)
        self.target_domain_dao = DocPackTargetDomainDAO(session)
        self.target_repo_dao = DocPackTargetRepoDAO(session)
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

    async def _enforce_single_lead(self, project_id: str, keep_employee_id: str) -> None:
        """A project has at most one team lead — demote every other member currently flagged as lead."""
        for m in await self.member_dao.list_for_project(project_id):
            if m.is_lead and m.employee_id != keep_employee_id:
                await self.member_dao.update(m.id, is_lead=False)

    # ---- lookups -----------------------------------------------------------

    async def _get_project(self, org_id: str, project_id: str) -> Project:
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")
        return project

    async def _get_module(self, org_id: str, project_id: str, module_id: str) -> ProjectModule:
        module = await self.module_dao.get_by_id_for_org(org_id, module_id)
        if module is None or module.project_id != project_id:
            raise NotFoundError(f"Module {module_id} not found")
        return module

    # ---- validation --------------------------------------------------------

    async def _validate_repo(self, org_id: str, repo_id: str | None) -> None:
        if repo_id is None:
            return
        if await self.repo_dao.get_by_id_for_org(org_id, repo_id) is None:
            raise ValidationError(f"Repo {repo_id} not found")

    async def _validate_function_type_ids(self, project_id: str, function_type_ids: list[str]) -> None:
        for ft_id in function_type_ids:
            if await self.function_type_dao.get_by_id_for_project(project_id, ft_id) is None:
                raise ValidationError(f"Function type {ft_id} not found in this project")

    @staticmethod
    def _dump_links(links) -> list | None:
        if links is None:
            return None
        return [item.model_dump() if hasattr(item, "model_dump") else item for item in links]

    # ---- response builders -------------------------------------------------

    def _repos(self, project: Project) -> list[ProjectRepoResponse]:
        return [
            ProjectRepoResponse(
                repo_id=link.repo_id,
                name=link.repo.name if link.repo else None,
                url=link.repo.url if link.repo else None,
                is_primary=link.is_primary,
                assignees=[
                    RepoAssignee(employee_id=m.employee_id, name=m.employee.name) for m in link.members if m.employee
                ],
            )
            for link in project.repos
        ]

    async def _base_response(self, project: Project) -> ProjectResponse:
        member_count = await self.member_dao.count_for_project(project.id)
        track_count = len(await self.pack_dao.list_for_project(project.org_id, project.id))
        module_count = len(await self.module_dao.list_for_project(project.id))
        lead = await self.member_dao.get_lead_for_project(project.id)
        return ProjectResponse(
            id=project.id,
            org_id=project.org_id,
            name=project.name,
            description=project.description,
            status=project.status.value,
            is_archived=project.is_archived,
            repo_id=project.repo_id,
            repo_name=project.repo.name if project.repo else None,
            repos=self._repos(project),
            lead_employee_id=lead.employee_id if lead else None,
            lead_name=lead.employee.name if lead and lead.employee else None,
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

    async def _modules_for_viewer(
        self, org_id: str, project_id: str, viewer: Employee, *, can_manage: bool
    ) -> list[ProjectModuleResponse]:
        """Shared module reader used by both the module surface and the project detail view."""
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
