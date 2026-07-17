from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.org_domain import OrgDomain


class OrgDomainDAO(BaseDAO[OrgDomain]):
    model = OrgDomain

    async def list_for_org(self, org_id: str) -> list[OrgDomain]:
        result = await self.session.execute(
            select(OrgDomain).where(OrgDomain.org_id == org_id).order_by(OrgDomain.name)
        )
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, domain_id: str) -> OrgDomain | None:
        result = await self.session.execute(
            select(OrgDomain).where(OrgDomain.id == domain_id, OrgDomain.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name_for_org(self, org_id: str, name: str) -> OrgDomain | None:
        result = await self.session.execute(
            select(OrgDomain).where(OrgDomain.org_id == org_id, OrgDomain.name == name)
        )
        return result.scalar_one_or_none()
