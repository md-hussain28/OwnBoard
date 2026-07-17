"""Projects — team/product spaces a hire is placed on (Projects PRD §1).

A project bundles project-specific onboarding tracks plus its members. A member must pass every
project track before the project unlocks for them; once unlocked they become a documented go-to
person for the project (and its linked repo). General/company tracks are separate — see DocPackService.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.api.schema.project.response import (
    MyProjectResponse,
    ProjectDetailResponse,
    ProjectMemberResponse,
    ProjectReadiness,
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
from onboard.dao.pack_assignment_dao import PackAssignmentDAO
from onboard.dao.project_dao import ProjectDAO, ProjectMemberDAO
from onboard.dao.repo_dao import RepoDAO
from onboard.services.pack_assignment.auto_assign import assign_project_tracks_to_member


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
        self.pack_dao = DocPackDAO(session)
        self.assignment_dao = PackAssignmentDAO(session)
        self.employee_dao = EmployeeDAO(session)
        self.repo_dao = RepoDAO(session)

    # ---- response builders -------------------------------------------------

    async def _base_response(self, project: Project) -> ProjectResponse:
        member_count = await self.member_dao.count_for_project(project.id)
        track_count = len(await self.pack_dao.list_for_project(project.org_id, project.id))
        return ProjectResponse(
            id=project.id,
            org_id=project.org_id,
            name=project.name,
            description=project.description,
            status=project.status.value,
            repo_id=project.repo_id,
            repo_name=project.repo.name if project.repo else None,
            created_by=project.created_by,
            created_at=project.created_at,
            updated_at=project.updated_at,
            member_count=member_count,
            track_count=track_count,
        )

    # ---- CRUD --------------------------------------------------------------

    async def _validate_repo(self, org_id: str, repo_id: str | None) -> None:
        if repo_id is None:
            return
        if await self.repo_dao.get_by_id_for_org(org_id, repo_id) is None:
            raise ValidationError(f"Repo {repo_id} not found")

    async def create_project(
        self, org_id: str, name: str, description: str | None, repo_id: str | None, created_by: str | None
    ) -> ProjectResponse:
        cleaned = " ".join(name.split()).strip()
        if not cleaned:
            raise ValidationError("Project name cannot be empty")
        await self._validate_repo(org_id, repo_id)
        project = await self.project_dao.create(
            org_id=org_id, name=cleaned, description=description, repo_id=repo_id, created_by=created_by
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
        *,
        name: str | None = None,
        description: str | None = None,
        repo_id: str | None = None,
        clear_repo: bool = False,
        status: str | None = None,
    ) -> ProjectResponse:
        project = await self._get_project(org_id, project_id)
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
        if fields:
            await self.project_dao.update(project.id, **fields)
        project = await self._get_project(org_id, project_id)
        return await self._base_response(project)

    async def delete_project(self, org_id: str, project_id: str) -> None:
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")
        await self.project_dao.delete(project.id)

    # ---- membership + readiness -------------------------------------------

    async def list_my_projects(self, org_id: str, employee: Employee) -> list[MyProjectResponse]:
        """The member's own projects with their lock/progress on each (the 'My projects' surface)."""
        project_ids = set(await self.member_dao.list_project_ids_for_employee(org_id, employee.id))
        if not project_ids:
            return []
        # One pass over the member's assignments, bucketed by the track's project.
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
                    assignment_id=a.id if a else None,
                    my_status=a.status.value if a else "not_assigned",
                    passed=a is not None and a.status == PackAssignmentStatus.passed,
                )
            )

        my_readiness = _readiness(gating_for_viewer) if is_member else None
        base = await self._base_response(project)
        return ProjectDetailResponse(
            **base.model_dump(),
            repo_url=project.repo.url if project.repo else None,
            tracks=track_responses,
            my_readiness=my_readiness,
            is_member=is_member,
            is_admin=is_admin,
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
                    readiness=readiness,
                    is_go_to=readiness.total_tracks > 0 and not readiness.locked,
                )
            )
        # Go-to people first, then the rest by name.
        rows.sort(key=lambda r: (not r.is_go_to, r.name.lower()))
        return rows

    async def add_members(
        self, org_id: str, project_id: str, employee_ids: list[str], added_by: str | None
    ) -> list[ProjectMemberResponse]:
        project = await self._get_project(org_id, project_id)
        for employee_id in dict.fromkeys(employee_ids):  # de-dupe, preserve order
            employee = await self.employee_dao.get_by_id_for_org(org_id, employee_id)
            if employee is None:
                raise ValidationError(f"Employee {employee_id} not found")
            if await self.member_dao.get_for_project_and_employee(project_id, employee_id) is not None:
                continue  # already a member — idempotent
            await self.member_dao.create(
                org_id=org_id, project_id=project_id, employee_id=employee_id, added_by=added_by
            )
            # Fan out this project's published tracks to the new member so their gate is set up immediately.
            await assign_project_tracks_to_member(self.session, org_id, project_id, employee_id)
        return await self._build_member_panel(org_id, project.id)

    async def remove_member(self, org_id: str, project_id: str, employee_id: str) -> None:
        await self._get_project(org_id, project_id)
        membership = await self.member_dao.get_for_project_and_employee(project_id, employee_id)
        if membership is None:
            raise NotFoundError(f"Employee {employee_id} is not a member of project {project_id}")
        await self.member_dao.delete(membership.id)

    async def list_project_tracks(self, org_id: str, project_id: str, viewer: Employee) -> list[ProjectTrackResponse]:
        detail = await self.get_project_detail(org_id, project_id, viewer)
        return detail.tracks
