"""Project ↔ repo links: attach/detach repos and keep the project's primary repo in sync."""

from onboard.api.schema.project.response import ProjectResponse
from onboard.core.common.exceptions import NotFoundError, ValidationError
from onboard.dao.models.employee import Employee
from onboard.services.project.base import ProjectServiceBase


class ProjectRepoMixin(ProjectServiceBase):
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
