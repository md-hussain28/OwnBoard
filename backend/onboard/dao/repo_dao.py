from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.repo import Repo


class RepoDAO(BaseDAO[Repo]):
    model = Repo

    async def get_by_url_for_org(self, org_id: str, url: str) -> Repo | None:
        result = await self.session.execute(select(Repo).where(Repo.org_id == org_id, Repo.url == url))
        return result.scalar_one_or_none()

    async def list_for_org(self, org_id: str, limit: int = 100, offset: int = 0) -> list[Repo]:
        result = await self.session.execute(select(Repo).where(Repo.org_id == org_id).limit(limit).offset(offset))
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, repo_id: str) -> Repo | None:
        result = await self.session.execute(select(Repo).where(Repo.id == repo_id, Repo.org_id == org_id))
        return result.scalar_one_or_none()
