"""Shared foundation for the employee service: DAO wiring and domain-id resolvers reused by the
core CRUD and by the invitation / Clerk-sync mixins composed into `EmployeeService`."""

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.org_domain_dao import OrgDomainDAO


class EmployeeServiceBase:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.employee_dao = EmployeeDAO(session)
        self.domain_dao = OrgDomainDAO(session)

    async def _resolve_domain_id(self, org_id: str, domain_id: str | None) -> str | None:
        if domain_id is None:
            return None
        domain = await self.domain_dao.get_by_id_for_org(org_id, domain_id)
        if domain is None:
            raise NotFoundError(f"Domain {domain_id} not found")
        return domain.id

    async def _soft_resolve_domain_id(self, org_id: str, domain_id: str | None) -> str | None:
        """Like `_resolve_domain_id`, but drops unknown ids (e.g. deleted between invite and join)."""
        if domain_id is None:
            return None
        domain = await self.domain_dao.get_by_id_for_org(org_id, domain_id)
        return domain.id if domain is not None else None
