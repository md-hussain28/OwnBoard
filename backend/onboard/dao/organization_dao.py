from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.organization import Organization


class OrganizationDAO(BaseDAO[Organization]):
    model = Organization

    async def get_or_create(self, org_id: str, name: str | None = None) -> Organization:
        existing = await self.get_by_id(org_id)
        if existing is not None:
            return existing
        return await self.create(id=org_id, name=name)
