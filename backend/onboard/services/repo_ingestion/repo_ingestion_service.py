from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.dao.models.repo import Repo
from onboard.dao.repo_dao import RepoDAO


class RepoIngestionService:
    """Repo registration CRUD, scoped to the caller's active organization. Git cloning/parsing is future work
    (PRD §6.1)."""

    def __init__(self, session: AsyncSession):
        self.repo_dao = RepoDAO(session)

    async def register_repo(self, org_id: str, url: str, name: str) -> Repo:
        existing = await self.repo_dao.get_by_url_for_org(org_id, url)
        if existing is not None:
            return existing
        return await self.repo_dao.create(org_id=org_id, url=url, name=name)

    async def get_repo(self, org_id: str, repo_id: str) -> Repo:
        repo = await self.repo_dao.get_by_id_for_org(org_id, repo_id)
        if repo is None:
            raise NotFoundError(f"Repo {repo_id} not found")
        return repo

    async def list_repos(self, org_id: str, limit: int = 100, offset: int = 0) -> list[Repo]:
        return await self.repo_dao.list_for_org(org_id, limit=limit, offset=offset)
