from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import DEFAULT_ORG_DOMAINS
from onboard.core.common.exceptions import NotFoundError, ValidationError
from onboard.dao.models.org_domain import OrgDomain
from onboard.dao.org_domain_dao import OrgDomainDAO


class OrgDomainService:
    """Org work domains (Developer, Marketing, …) for assigning members."""

    def __init__(self, session: AsyncSession):
        self.domain_dao = OrgDomainDAO(session)

    async def ensure_defaults(self, org_id: str) -> None:
        """Seed the built-in domain list once per org (idempotent)."""
        existing = {d.name.lower() for d in await self.domain_dao.list_for_org(org_id)}
        for name in DEFAULT_ORG_DOMAINS:
            if name.lower() in existing:
                continue
            await self.domain_dao.create(org_id=org_id, name=name, is_default=True)

    async def list_domains(self, org_id: str) -> list[OrgDomain]:
        await self.ensure_defaults(org_id)
        return await self.domain_dao.list_for_org(org_id)

    def _normalize_name(self, name: str) -> str:
        cleaned = " ".join(name.split()).strip()
        if not cleaned:
            raise ValidationError("Domain name cannot be empty")
        if len(cleaned) > 128:
            raise ValidationError("Domain name is too long")
        return cleaned

    async def _assert_name_available(
        self, org_id: str, cleaned: str, *, exclude_id: str | None = None
    ) -> None:
        for domain in await self.domain_dao.list_for_org(org_id):
            if exclude_id is not None and domain.id == exclude_id:
                continue
            if domain.name.lower() == cleaned.lower():
                raise ValidationError(f"Domain '{domain.name}' already exists")

    async def create_domain(self, org_id: str, name: str) -> OrgDomain:
        cleaned = self._normalize_name(name)
        await self._assert_name_available(org_id, cleaned)
        return await self.domain_dao.create(org_id=org_id, name=cleaned, is_default=False)

    async def update_domain(self, org_id: str, domain_id: str, name: str) -> OrgDomain:
        domain = await self.get_domain(org_id, domain_id)
        cleaned = self._normalize_name(name)
        if cleaned == domain.name:
            return domain
        await self._assert_name_available(org_id, cleaned, exclude_id=domain.id)
        updated = await self.domain_dao.update(domain.id, name=cleaned)
        if updated is None:
            raise NotFoundError(f"Domain {domain_id} not found")
        return updated

    async def delete_domain(self, org_id: str, domain_id: str) -> None:
        domain = await self.domain_dao.get_by_id_for_org(org_id, domain_id)
        if domain is None:
            raise NotFoundError(f"Domain {domain_id} not found")
        if domain.is_default:
            raise ValidationError("Built-in domains cannot be deleted")
        await self.domain_dao.delete(domain.id)

    async def get_domain(self, org_id: str, domain_id: str) -> OrgDomain:
        domain = await self.domain_dao.get_by_id_for_org(org_id, domain_id)
        if domain is None:
            raise NotFoundError(f"Domain {domain_id} not found")
        return domain
