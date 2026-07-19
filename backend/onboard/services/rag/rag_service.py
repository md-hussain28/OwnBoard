import asyncio
from dataclasses import dataclass

from pgvector import Vector
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import EMBEDDING_BATCH_SIZE
from onboard.core.common.exceptions import NotFoundError, ValidationError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.core.rag.chunking import ChunkDraft, chunk_extracted_document
from onboard.core.rag.extract import extract_document
from onboard.core.storage.supabase_client import SupabaseStorageClient, get_storage_client
from onboard.dao.code_chunk_dao import CodeChunkDAO
from onboard.dao.doc_chunk_dao import DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackDAO, DocPackDocumentDAO
from onboard.dao.models.doc_pack import DocChunk, DocumentStatus
from onboard.dao.repo_dao import RepoDAO


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
        self.repo_dao = RepoDAO(session)
        self.code_chunk_dao = CodeChunkDAO(session)

    async def _storage_client(self) -> SupabaseStorageClient:
        if self._storage is None:
            self._storage = await get_storage_client()
        return self._storage

    async def embed_pending_chunks(self, repo_id: str | None = None, limit: int = 500) -> int:
        """Embed code chunks that landed at ingest with `embedding = NULL`.

        This is the one heavy step in the pipeline. It runs off the web dyno via
        `onboard.jobs.embed_pending` (a GitHub Actions cron), and is also exposed as a bounded,
        admin-only manual trigger. One call embeds up to `limit` pending chunks and returns how many
        it wrote; callers loop until it returns 0.
        """
        pending = await self.code_chunk_dao.list_pending(limit, repo_id=repo_id)
        if not pending:
            return 0
        embedded = 0
        for start in range(0, len(pending), EMBEDDING_BATCH_SIZE):
            batch = pending[start : start + EMBEDDING_BATCH_SIZE]
            # Prefix with the path so retrieval can match on filename cues, not just body text.
            vectors = await self.llm.embed_batch([f"{c.file_path}\n\n{c.content}" for c in batch])
            for chunk, vector in zip(batch, vectors, strict=True):
                chunk.embedding = Vector(vector)  # float32 array, ~8x smaller than the raw list
            embedded += len(batch)
        await self.session.commit()
        return embedded

    async def retrieve_code(self, org_id: str, repo_id: str, query: str, *, top_k: int = 5) -> list[dict]:
        """Semantic search over a repo's embedded code chunks (PRD §6.3). One query embed + kNN."""
        if await self.repo_dao.get_by_id_for_org(org_id, repo_id) is None:
            raise NotFoundError(f"Repo {repo_id} not found")
        query_embedding = await self.llm.embed(query)
        hits = await self.code_chunk_dao.similarity_search(repo_id, query_embedding, top_k=top_k)
        return [
            {"file_path": chunk.file_path, "content": chunk.content, "score": max(0.0, 1.0 - distance)}
            for chunk, distance in hits
        ]

    async def ingest_doc_pack_document(self, org_id: str, document_id: str) -> int:
        """Extract → chunk → batch-embed → upsert `doc_chunk` rows. Returns chunk count."""
        document = await self.document_dao.get_by_id_for_org(org_id, document_id)
        if document is None:
            raise NotFoundError(f"Document {document_id} not found")

        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, document.doc_pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {document.doc_pack_id} not found")

        # Duplicate schedules happen (a stale-requeue can race an ingest that was merely queued
        # behind the ingest semaphore, not dead). Every scheduler flips status away from
        # `processed` first, so a processed doc here is always a duplicate — skip the
        # download/extract/embed instead of paying for it twice.
        if document.status == DocumentStatus.processed:
            return await self.doc_chunk_dao.count_for_document(document.id)

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
            del raw  # 512MB host: don't hold the file bytes through chunking + embedding
            drafts = await asyncio.to_thread(chunk_extracted_document, extracted)
            page_count = extracted.page_count
            del extracted  # page texts are duplicated into the drafts; free the originals
            if not drafts:
                raise ValidationError("No chunks produced from document")

            # Ground every chunk's embedding in the document's uploader-supplied context (title +
            # description). Stored `content` stays clean for citations; only the embedded text carries
            # the header, so retrieval for "Ask project" matches on the doc's stated intent, not just
            # the raw page text.
            context_header = self._document_context_header(document.title, document.description)
            embeddings = await self._embed_drafts(drafts, context=context_header)
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
            count = await self.doc_chunk_dao.replace_for_document(document.id, rows)
            await self.document_dao.update(
                document.id,
                status=DocumentStatus.processed,
                page_count=page_count,
                error_message=None,
            )
            return count
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

    @staticmethod
    def _document_context_header(title: str | None, description: str | None) -> str:
        """A short header prepended to each chunk's embedding input (not its stored content)."""
        lines: list[str] = []
        if title:
            lines.append(f"Document: {title}")
        if description and description.strip():
            lines.append(f"Context: {description.strip()}")
        return ("\n".join(lines) + "\n\n") if lines else ""

    async def _embed_drafts(self, drafts: list[ChunkDraft], context: str = "") -> list[Vector]:
        """Batch-embed chunk texts, holding each vector as a pgvector `Vector` (float32 array).

        A 1536-dim embedding as a Python list of floats is ~50KB; as `Vector` it's ~6KB. A large
        PDF produces hundreds of chunks, so keeping the raw lists alive until the DB insert was
        one of the bigger ingest memory spikes on the 512MB host. `Vector` passes through the
        SQLAlchemy bind processor unchanged, so rows can carry it directly.
        """
        embeddings: list[Vector] = []
        # Build each batch's texts just-in-time: materializing context+content for every chunk up
        # front duplicates the whole document's text on top of the drafts.
        for start in range(0, len(drafts), EMBEDDING_BATCH_SIZE):
            batch = [context + draft.content for draft in drafts[start : start + EMBEDDING_BATCH_SIZE]]
            embeddings.extend(Vector(vector) for vector in await self.llm.embed_batch(batch))
        return embeddings
