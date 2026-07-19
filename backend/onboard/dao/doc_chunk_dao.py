from dataclasses import dataclass
from typing import Any

from sqlalchemy import delete, func, insert, select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.doc_pack import DocChunk, DocPack


@dataclass(frozen=True, slots=True)
class DocChunkContent:
    """Lean chunk row for content-only readers — no pgvector payload."""

    document_id: str
    chunk_index: int
    content: str
    page_start: int | None
    page_end: int | None
    section_title: str | None = None


class DocChunkDAO(BaseDAO[DocChunk]):
    model = DocChunk

    async def count_for_document(self, document_id: str) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(DocChunk).where(DocChunk.document_id == document_id)
        )
        return int(result.scalar_one())

    async def delete_for_document(self, document_id: str) -> None:
        await self.session.execute(delete(DocChunk).where(DocChunk.document_id == document_id))
        await self.session.commit()

    async def replace_for_document(self, document_id: str, rows: list[dict[str, Any]]) -> int:
        """Idempotent re-ingest: drop prior chunks for the document, then insert the new set.

        Core bulk insert on purpose — building one ORM instance per chunk and refreshing each
        (a SELECT per row) held every embedding in the session twice during ingest, which is
        real memory on the 512MB host. Returns the inserted count; callers never used the rows.
        """
        await self.session.execute(delete(DocChunk).where(DocChunk.document_id == document_id))
        if rows:
            await self.session.execute(insert(DocChunk), rows)
        await self.session.commit()
        return len(rows)

    async def list_for_document(self, org_id: str, document_id: str) -> list[DocChunk]:
        result = await self.session.execute(
            select(DocChunk)
            .where(DocChunk.org_id == org_id, DocChunk.document_id == document_id)
            .order_by(DocChunk.chunk_index)
        )
        return list(result.scalars().all())

    async def list_for_pack(self, org_id: str, doc_pack_id: str) -> list[DocChunk]:
        result = await self.session.execute(
            select(DocChunk)
            .where(DocChunk.org_id == org_id, DocChunk.doc_pack_id == doc_pack_id)
            .order_by(DocChunk.document_id, DocChunk.chunk_index)
        )
        return list(result.scalars().all())

    async def list_content_for_pack(self, org_id: str, doc_pack_id: str) -> list[DocChunkContent]:
        """Quiz-generation load path: skip 1536-dim embeddings (unused by coverage planning)."""
        result = await self.session.execute(
            select(
                DocChunk.document_id,
                DocChunk.chunk_index,
                DocChunk.content,
                DocChunk.page_start,
                DocChunk.page_end,
            )
            .where(DocChunk.org_id == org_id, DocChunk.doc_pack_id == doc_pack_id)
            .order_by(DocChunk.document_id, DocChunk.chunk_index)
        )
        return [
            DocChunkContent(
                document_id=row.document_id,
                chunk_index=row.chunk_index,
                content=row.content,
                page_start=row.page_start,
                page_end=row.page_end,
            )
            for row in result.all()
        ]

    async def list_content_for_document(self, org_id: str, document_id: str) -> list[DocChunkContent]:
        """Document-viewer load path: skip 1536-dim embeddings (one full doc can be hundreds of chunks)."""
        result = await self.session.execute(
            select(
                DocChunk.document_id,
                DocChunk.chunk_index,
                DocChunk.content,
                DocChunk.page_start,
                DocChunk.page_end,
                DocChunk.section_title,
            )
            .where(DocChunk.org_id == org_id, DocChunk.document_id == document_id)
            .order_by(DocChunk.chunk_index)
        )
        return [
            DocChunkContent(
                document_id=row.document_id,
                chunk_index=row.chunk_index,
                content=row.content,
                page_start=row.page_start,
                page_end=row.page_end,
                section_title=row.section_title,
            )
            for row in result.all()
        ]

    async def similarity_search(
        self,
        org_id: str,
        doc_pack_id: str,
        query_embedding: list[float],
        *,
        top_k: int = 8,
        document_id: str | None = None,
    ) -> list[tuple[DocChunk, float]]:
        """Cosine-distance nearest neighbors, always org + pack scoped (PRD §12)."""
        distance = DocChunk.embedding.cosine_distance(query_embedding)
        stmt = (
            select(DocChunk, distance.label("distance"))
            .where(
                DocChunk.org_id == org_id,
                DocChunk.doc_pack_id == doc_pack_id,
                DocChunk.embedding.is_not(None),
            )
            .order_by(distance)
            .limit(top_k)
        )
        if document_id is not None:
            stmt = stmt.where(DocChunk.document_id == document_id)
        result = await self.session.execute(stmt)
        return [(row[0], float(row[1])) for row in result.all()]

    async def similarity_search_for_project(
        self,
        org_id: str,
        project_id: str,
        query_embedding: list[float],
        *,
        top_k: int = 6,
    ) -> list[tuple[DocChunk, float]]:
        """Cosine-distance nearest neighbors across every doc pack belonging to a project.

        Joins `DocPack` and filters on `DocPack.project_id` (project-specific tracks) so a single
        query spans all of a project's uploaded docs, always org-scoped.
        """
        distance = DocChunk.embedding.cosine_distance(query_embedding)
        stmt = (
            select(DocChunk, distance.label("distance"))
            .join(DocPack, DocChunk.doc_pack_id == DocPack.id)
            .where(
                DocChunk.org_id == org_id,
                DocPack.project_id == project_id,
                DocChunk.embedding.is_not(None),
            )
            .order_by(distance)
            .limit(top_k)
        )
        result = await self.session.execute(stmt)
        return [(row[0], float(row[1])) for row in result.all()]
