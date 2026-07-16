from pathlib import PurePosixPath

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import ALLOWED_DOC_PACK_EXTENSIONS
from onboard.core.common.exceptions import NotFoundError, ValidationError
from onboard.core.common.ids import generate_id
from onboard.core.common.logger import get_logger
from onboard.core.database.postgres import get_session_factory
from onboard.core.storage.supabase_client import SupabaseStorageClient, get_storage_client
from onboard.dao.doc_chunk_dao import DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackDAO, DocPackDocumentDAO
from onboard.dao.models.doc_pack import DocPack, DocPackDocument, DocPackStatus, DocumentStatus
from onboard.services.rag.rag_service import RAGService

logger = get_logger("onboard.doc_pack")

_CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
    "md": "text/markdown",
    "markdown": "text/markdown",
}


class DocPackService:
    """Doc Pack CRUD, file upload, and ingestion kickoff (Doc Pack PRD §3/§5/§8/§12)."""

    def __init__(self, session: AsyncSession, storage: SupabaseStorageClient | None = None):
        self.session = session
        self.pack_dao = DocPackDAO(session)
        self.document_dao = DocPackDocumentDAO(session)
        self.chunk_dao = DocChunkDAO(session)
        self.rag = RAGService(session)
        self._storage = storage

    async def _storage_client(self) -> SupabaseStorageClient:
        if self._storage is None:
            self._storage = await get_storage_client()
        return self._storage

    async def create_pack(
        self, org_id: str, name: str, description: str | None = None, created_by: str | None = None
    ) -> DocPack:
        return await self.pack_dao.create(
            org_id=org_id,
            name=name.strip(),
            description=description,
            status=DocPackStatus.draft,
            created_by=created_by,
        )

    async def list_packs(self, org_id: str, limit: int = 100, offset: int = 0) -> list[DocPack]:
        return await self.pack_dao.list_for_org(org_id, limit=limit, offset=offset)

    async def get_pack(self, org_id: str, pack_id: str) -> DocPack:
        pack = await self.pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")
        return pack

    async def update_pack(
        self, org_id: str, pack_id: str, *, name: str | None = None, description: str | None = None
    ) -> DocPack:
        pack = await self.get_pack(org_id, pack_id)
        fields: dict = {}
        if name is not None:
            fields["name"] = name.strip()
        if description is not None:
            fields["description"] = description
        if not fields:
            return pack
        updated = await self.pack_dao.update(pack.id, **fields)
        assert updated is not None
        return await self.get_pack(org_id, pack_id)

    async def upload_documents(
        self,
        org_id: str,
        pack_id: str,
        files: list[tuple[str, bytes, str | None]],
    ) -> list[DocPackDocument]:
        """Upload files to Supabase Storage and create `doc_pack_document` rows.

        `files` is a list of `(filename, content, content_type)` tuples.
        Caller should schedule `ingest_document_background` for each returned document id.
        """
        pack = await self.get_pack(org_id, pack_id)
        if not files:
            raise ValidationError("At least one file is required")

        storage = await self._storage_client()
        created: list[DocPackDocument] = []

        for filename, content, content_type in files:
            extension = _extension_for(filename)
            if extension not in ALLOWED_DOC_PACK_EXTENSIONS:
                raise ValidationError(f"Unsupported file type: {filename}")
            if not content:
                raise ValidationError(f"Empty file: {filename}")

            document_id = generate_id()
            safe_name = PurePosixPath(filename).name.replace(" ", "_")
            storage_path = f"{org_id}/{pack.id}/{document_id}-{safe_name}"
            mime = content_type or _CONTENT_TYPES.get(extension, "application/octet-stream")

            await storage.upload(storage_path, content, mime)
            document = await self.document_dao.create(
                id=document_id,
                doc_pack_id=pack.id,
                title=PurePosixPath(filename).stem or safe_name,
                storage_path=storage_path,
                file_type=extension if extension != "markdown" else "md",
                file_size_bytes=len(content),
                status=DocumentStatus.uploaded,
            )
            created.append(document)

        return created

    async def delete_document(self, org_id: str, pack_id: str, document_id: str) -> None:
        pack = await self.get_pack(org_id, pack_id)
        document = await self.document_dao.get_by_id_for_pack(pack.id, document_id)
        if document is None:
            raise NotFoundError(f"Document {document_id} not found")

        await self.chunk_dao.delete_for_document(document.id)
        storage = await self._storage_client()
        try:
            await storage.delete(document.storage_path)
        except Exception:
            logger.exception("storage_delete_failed path=%s", document.storage_path)
        await self.document_dao.delete(document.id)

    async def ingest_document(self, org_id: str, document_id: str) -> int:
        return await self.rag.ingest_doc_pack_document(org_id, document_id)


async def ingest_document_background(org_id: str, document_id: str) -> None:
    """Background entrypoint: opens its own DB session (request session is already closed)."""
    factory = get_session_factory()
    async with factory() as session:
        service = DocPackService(session)
        try:
            count = await service.ingest_document(org_id, document_id)
            logger.info("doc_ingest_ok document_id=%s chunks=%s", document_id, count)
        except Exception:
            logger.exception("doc_ingest_failed document_id=%s", document_id)


def _extension_for(filename: str) -> str:
    suffix = PurePosixPath(filename).suffix.lower().lstrip(".")
    return suffix
