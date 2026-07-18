from sqlalchemy import delete, select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.contributor import Contributor


class ContributorDAO(BaseDAO[Contributor]):
    model = Contributor

    async def get_by_email(self, email: str) -> Contributor | None:
        result = await self.session.execute(select(Contributor).where(Contributor.email == email))
        return result.scalar_one_or_none()

    async def list_for_repo(self, repo_id: str) -> list[Contributor]:
        result = await self.session.execute(
            select(Contributor).where(Contributor.repo_id == repo_id).order_by(Contributor.name)
        )
        return list(result.scalars().all())

    async def delete_for_repo(self, repo_id: str) -> None:
        await self.session.execute(delete(Contributor).where(Contributor.repo_id == repo_id))
