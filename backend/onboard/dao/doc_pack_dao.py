from sqlalchemy import select
from sqlalchemy.orm import selectinload

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.doc_pack import DocPack, DocPackDocument


class DocPackDAO(BaseDAO[DocPack]):
    model = DocPack

    async def list_for_org(self, org_id: str, limit: int = 100, offset: int = 0) -> list[DocPack]:
        result = await self.session.execute(
            select(DocPack)
            .where(DocPack.org_id == org_id)
            .order_by(DocPack.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, pack_id: str) -> DocPack | None:
        result = await self.session.execute(
            select(DocPack)
            .where(DocPack.id == pack_id, DocPack.org_id == org_id)
            .options(selectinload(DocPack.documents))
        )
        return result.scalar_one_or_none()


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

    async def get_by_id_for_org(self, org_id: str, document_id: str) -> DocPackDocument | None:
        result = await self.session.execute(
            select(DocPackDocument)
            .join(DocPack, DocPack.id == DocPackDocument.doc_pack_id)
            .where(DocPackDocument.id == document_id, DocPack.org_id == org_id)
        )
        return result.scalar_one_or_none()
