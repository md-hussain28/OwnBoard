from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.doc_pack import DocPack, DocPackAudienceDomain, DocPackDocument

_AUDIENCE_LOAD = selectinload(DocPack.audience_domains).selectinload(DocPackAudienceDomain.org_domain)


class DocPackDAO(BaseDAO[DocPack]):
    model = DocPack

    async def exists_for_org(self, org_id: str, pack_id: str) -> bool:
        """Primary-key existence probe — no row hydration, used by the hot status-polling path."""
        result = await self.session.execute(select(DocPack.id).where(DocPack.id == pack_id, DocPack.org_id == org_id))
        return result.scalar_one_or_none() is not None

    async def list_for_org(self, org_id: str, limit: int = 100, offset: int = 0) -> list[DocPack]:
        result = await self.session.execute(
            select(DocPack)
            .where(DocPack.org_id == org_id)
            .options(selectinload(DocPack.domain), _AUDIENCE_LOAD)
            .order_by(DocPack.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, pack_id: str) -> DocPack | None:
        result = await self.session.execute(
            select(DocPack)
            .where(DocPack.id == pack_id, DocPack.org_id == org_id)
            .options(
                selectinload(DocPack.documents),
                selectinload(DocPack.domain),
                _AUDIENCE_LOAD,
            )
        )
        return result.scalar_one_or_none()

    async def list_auto_assign_targets_for_domain(self, org_id: str, domain_id: str | None) -> list[DocPack]:
        """Packs whose audience includes this employee — 'everyone' packs plus (if the employee has a
        domain) packs that name that domain. The caller still filters to those with a published quiz."""
        audience_pack_ids = select(DocPackAudienceDomain.doc_pack_id).where(
            DocPackAudienceDomain.org_id == org_id,
            DocPackAudienceDomain.org_domain_id == domain_id,
        )
        conditions = [DocPack.assign_to_all.is_(True)]
        if domain_id is not None:
            conditions.append(DocPack.id.in_(audience_pack_ids))
        result = await self.session.execute(select(DocPack).where(DocPack.org_id == org_id, or_(*conditions)))
        return list(result.scalars().all())


class DocPackAudienceDomainDAO(BaseDAO[DocPackAudienceDomain]):
    model = DocPackAudienceDomain

    async def list_domain_ids_for_pack(self, doc_pack_id: str) -> list[str]:
        result = await self.session.execute(
            select(DocPackAudienceDomain.org_domain_id).where(DocPackAudienceDomain.doc_pack_id == doc_pack_id)
        )
        return list(result.scalars().all())

    async def replace_for_pack(self, org_id: str, doc_pack_id: str, org_domain_ids: list[str]) -> None:
        """Set the pack's audience domains to exactly `org_domain_ids` (idempotent full replace)."""
        existing = await self.session.execute(
            select(DocPackAudienceDomain).where(DocPackAudienceDomain.doc_pack_id == doc_pack_id)
        )
        current = {row.org_domain_id: row for row in existing.scalars().all()}
        wanted = set(org_domain_ids)

        for domain_id, row in current.items():
            if domain_id not in wanted:
                await self.session.delete(row)
        for domain_id in wanted - current.keys():
            self.session.add(DocPackAudienceDomain(org_id=org_id, doc_pack_id=doc_pack_id, org_domain_id=domain_id))
        await self.session.commit()


class DocPackDocumentDAO(BaseDAO[DocPackDocument]):
    model = DocPackDocument

    async def list_for_pack(self, doc_pack_id: str) -> list[DocPackDocument]:
        result = await self.session.execute(
            select(DocPackDocument)
            .where(DocPackDocument.doc_pack_id == doc_pack_id)
            .order_by(DocPackDocument.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_pack(self, doc_pack_id: str, document_id: str) -> DocPackDocument | None:
        result = await self.session.execute(
            select(DocPackDocument).where(DocPackDocument.id == document_id, DocPackDocument.doc_pack_id == doc_pack_id)
        )
        return result.scalar_one_or_none()

    async def list_status_for_pack(self, org_id: str, pack_id: str):
        """Column-only status projection for polling — avoids hydrating ORM rows or loading document blobs."""
        result = await self.session.execute(
            select(
                DocPackDocument.id,
                DocPackDocument.title,
                DocPackDocument.status,
                DocPackDocument.page_count,
                DocPackDocument.error_message,
                DocPackDocument.ingest_attempts,
                DocPackDocument.updated_at,
            )
            .join(DocPack, DocPack.id == DocPackDocument.doc_pack_id)
            .where(DocPackDocument.doc_pack_id == pack_id, DocPack.org_id == org_id)
            .order_by(DocPackDocument.created_at.asc())
        )
        return result.all()

    async def get_by_id_for_org(self, org_id: str, document_id: str) -> DocPackDocument | None:
        result = await self.session.execute(
            select(DocPackDocument)
            .join(DocPack, DocPack.id == DocPackDocument.doc_pack_id)
            .where(DocPackDocument.id == document_id, DocPack.org_id == org_id)
        )
        return result.scalar_one_or_none()
