from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.quiz_domain import QuizDomain


class QuizDomainDAO(BaseDAO[QuizDomain]):
    model = QuizDomain

    async def list_for_org(self, org_id: str) -> list[QuizDomain]:
        result = await self.session.execute(
            select(QuizDomain).where(QuizDomain.org_id == org_id).order_by(QuizDomain.name)
        )
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, domain_id: str) -> QuizDomain | None:
        result = await self.session.execute(
            select(QuizDomain).where(QuizDomain.id == domain_id, QuizDomain.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name_for_org(self, org_id: str, name: str) -> QuizDomain | None:
        result = await self.session.execute(
            select(QuizDomain).where(QuizDomain.org_id == org_id, QuizDomain.name == name)
        )
        return result.scalar_one_or_none()
