from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.repo import Repo


class RepoDAO(BaseDAO[Repo]):
    model = Repo

    async def get_by_url(self, url: str) -> Repo | None:
        result = await self.session.execute(select(Repo).where(Repo.url == url))
        return result.scalar_one_or_none()
