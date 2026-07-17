"""Project create / list / update / delete (Projects PRD §1)."""

from onboard.api.schema.project.response import ProjectResponse
from onboard.core.common.exceptions import NotFoundError, ValidationError
from onboard.dao.models.employee import Employee
from onboard.dao.models.project import ProjectStatus
from onboard.services.project.base import ProjectServiceBase


class ProjectCrudMixin(ProjectServiceBase):
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
        project = await self._get_project(org_id, project.id)
        return await self._base_response(project)

    async def list_projects(self, org_id: str) -> list[ProjectResponse]:
        projects = await self.project_dao.list_for_org(org_id)
        return [await self._base_response(p) for p in projects]

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
