from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.policy_doc import PolicyDoc


class PolicyDocDAO(BaseDAO[PolicyDoc]):
    model = PolicyDoc

    async def list_for_org(self, org_id: str) -> list[PolicyDoc]:
        result = await self.session.execute(select(PolicyDoc).where(PolicyDoc.org_id == org_id))
        return list(result.scalars().all())
