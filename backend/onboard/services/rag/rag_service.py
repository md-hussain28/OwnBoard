import asyncio
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import EMBEDDING_BATCH_SIZE
from onboard.core.common.exceptions import NotFoundError, ValidationError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.core.rag.chunking import ChunkDraft, chunk_extracted_document
from onboard.core.rag.extract import extract_document
from onboard.core.storage.supabase_client import SupabaseStorageClient, get_storage_client
from onboard.dao.doc_chunk_dao import DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackDAO, DocPackDocumentDAO
from onboard.dao.models.doc_pack import DocChunk, DocumentStatus


@dataclass
class RetrievedDocChunk:
    chunk: DocChunk
    score: float
    document_title: str


class RAGService:
    """Chunking, embedding and retrieval over code/doc content (PRD §6.1/§6.3, Doc Pack PRD §12)."""

    def __init__(
        self,
        session: AsyncSession,
        llm: LLMClient | None = None,
        storage: SupabaseStorageClient | None = None,
    ):
        self.session = session
        self.llm = llm or get_llm_client()
        self._storage = storage
        self.doc_pack_dao = DocPackDAO(session)
        self.document_dao = DocPackDocumentDAO(session)
        self.doc_chunk_dao = DocChunkDAO(session)

    async def _storage_client(self) -> SupabaseStorageClient:
        if self._storage is None:
            self._storage = await get_storage_client()
        return self._storage

    async def chunk_and_embed(self, repo_id: str):
        raise NotImplementedError("chunk_and_embed is not implemented yet")

    async def retrieve(self, repo_id: str, query: str):
        raise NotImplementedError("retrieve is not implemented yet")

    async def ingest_doc_pack_document(self, org_id: str, document_id: str) -> int:
        """Extract → chunk → batch-embed → upsert `doc_chunk` rows. Returns chunk count."""
        document = await self.document_dao.get_by_id_for_org(org_id, document_id)
        if document is None:
            raise NotFoundError(f"Document {document_id} not found")

        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, document.doc_pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {document.doc_pack_id} not found")

        await self.document_dao.update(
            document.id,
            status=DocumentStatus.processing,
            error_message=None,
            ingest_attempts=document.ingest_attempts + 1,
        )

        try:
            storage = await self._storage_client()
            raw = await storage.download(document.storage_path)
            # PDF/DOCX parsing and token-counting are CPU-bound; run them off the event loop so
            # the (single-worker, 0.1-CPU) host keeps answering health checks during ingestion —
            # a blocked loop gets the instance restarted, killing the ingest task mid-flight.
            extracted = await asyncio.to_thread(extract_document, raw, document.file_type)
            drafts = await asyncio.to_thread(chunk_extracted_document, extracted)
            if not drafts:
                raise ValidationError("No chunks produced from document")

            embeddings = await self._embed_drafts(drafts)
            rows = [
                {
                    "org_id": org_id,
                    "document_id": document.id,
                    "doc_pack_id": document.doc_pack_id,
                    "chunk_index": draft.chunk_index,
                    "content": draft.content,
                    "token_count": draft.token_count,
                    "page_start": draft.page_start,
                    "page_end": draft.page_end,
                    "section_title": draft.section_title,
                    "embedding": embedding,
                }
                for draft, embedding in zip(drafts, embeddings, strict=True)
            ]
            chunks = await self.doc_chunk_dao.replace_for_document(document.id, rows)
            await self.document_dao.update(
                document.id,
                status=DocumentStatus.processed,
                page_count=extracted.page_count,
                error_message=None,
            )
            return len(chunks)
        except Exception as exc:
            # If the failure was a DB error the session holds a poisoned transaction — roll it
            # back first or this status write would raise too, stranding the doc in `processing`.
            # Use the plain `document_id` arg: rollback expires the ORM instance, and touching
            # `document.id` after it would trigger a sync lazy-load that fails under asyncio.
            await self.session.rollback()
            await self.document_dao.update(
                document_id,
                status=DocumentStatus.failed,
                error_message=str(exc)[:2000],
            )
            raise

    async def retrieve_doc_pack(
        self,
        org_id: str,
        doc_pack_id: str,
        query: str,
        *,
        top_k: int = 8,
        document_id: str | None = None,
    ) -> list[RetrievedDocChunk]:
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, doc_pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {doc_pack_id} not found")

        query_embedding = await self.llm.embed(query)
        hits = await self.doc_chunk_dao.similarity_search(
            org_id, doc_pack_id, query_embedding, top_k=top_k, document_id=document_id
        )
        title_by_doc = {doc.id: doc.title for doc in pack.documents}
        # cosine_distance → similarity score in [0, 2] inverted to higher-is-better
        return [
            RetrievedDocChunk(
                chunk=chunk,
                score=max(0.0, 1.0 - distance),
                document_title=title_by_doc.get(chunk.document_id, chunk.document_id),
            )
            for chunk, distance in hits
        ]

    async def _embed_drafts(self, drafts: list[ChunkDraft]) -> list[list[float]]:
        embeddings: list[list[float]] = []
        texts = [draft.content for draft in drafts]
        for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
            batch = texts[start : start + EMBEDDING_BATCH_SIZE]
            embeddings.extend(await self.llm.embed_batch(batch))
        return embeddings
