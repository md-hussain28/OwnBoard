from datetime import UTC, datetime, timedelta
from pathlib import PurePosixPath

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import (
    ALLOWED_DOC_PACK_EXTENSIONS,
    DOC_INGEST_STALE_AFTER_SECONDS,
    MAX_DOC_INGEST_ATTEMPTS,
    MAX_DOC_PACK_FILE_SIZE_BYTES,
    MAX_DOC_PACK_FILES_PER_UPLOAD,
)
from onboard.core.common.exceptions import NotFoundError, ValidationError
from onboard.core.common.logger import get_logger
from onboard.core.database.postgres import get_session_factory
from onboard.core.storage.supabase_client import SupabaseStorageClient, get_storage_client
from onboard.dao.doc_chunk_dao import DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackAudienceDomainDAO, DocPackDAO, DocPackDocumentDAO
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.doc_pack import DocPack, DocPackDocument, DocPackStatus, DocumentStatus
from onboard.dao.org_domain_dao import OrgDomainDAO
from onboard.dao.quiz_domain_dao import QuizDomainDAO
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
        self.domain_dao = QuizDomainDAO(session)
        self.org_domain_dao = OrgDomainDAO(session)
        self.employee_dao = EmployeeDAO(session)
        self.audience_dao = DocPackAudienceDomainDAO(session)
        self.rag = RAGService(session)
        self._storage = storage

    async def _storage_client(self) -> SupabaseStorageClient:
        if self._storage is None:
            self._storage = await get_storage_client()
        return self._storage

    async def _resolve_domain_id(self, org_id: str, domain_id: str | None) -> str | None:
        if domain_id is None:
            return None
        domain = await self.domain_dao.get_by_id_for_org(org_id, domain_id)
        if domain is None:
            raise NotFoundError(f"Quiz domain {domain_id} not found")
        return domain.id

    async def _resolve_audience_domain_ids(self, org_id: str, domain_ids: list[str]) -> list[str]:
        """Validate that every id is a real OrgDomain in this org; dedupe while preserving order."""
        resolved: list[str] = []
        seen: set[str] = set()
        for domain_id in domain_ids:
            if domain_id in seen:
                continue
            domain = await self.org_domain_dao.get_by_id_for_org(org_id, domain_id)
            if domain is None:
                raise NotFoundError(f"Audience domain {domain_id} not found")
            resolved.append(domain.id)
            seen.add(domain.id)
        return resolved

    async def create_pack(
        self,
        org_id: str,
        name: str,
        description: str | None = None,
        created_by: str | None = None,
        domain_id: str | None = None,
        assign_to_all: bool = False,
        audience_domain_ids: list[str] | None = None,
        sequence_order: int = 0,
        estimated_minutes: int | None = None,
        due_offset_days: int | None = None,
        project_id: str | None = None,
    ) -> DocPack:
        resolved_domain_id = await self._resolve_domain_id(org_id, domain_id)
        resolved_audience = await self._resolve_audience_domain_ids(org_id, audience_domain_ids or [])
        pack = await self.pack_dao.create(
            org_id=org_id,
            project_id=project_id,
            name=name.strip(),
            description=description,
            status=DocPackStatus.draft,
            created_by=created_by,
            domain_id=resolved_domain_id,
            assign_to_all=assign_to_all,
            sequence_order=sequence_order,
            estimated_minutes=estimated_minutes,
            due_offset_days=due_offset_days,
        )
        if resolved_audience:
            await self.audience_dao.replace_for_pack(org_id, pack.id, resolved_audience)
        return await self.get_pack(org_id, pack.id)

    async def list_packs(self, org_id: str, limit: int = 100, offset: int = 0) -> list[DocPack]:
        # Admin Tracks desk shows general/company tracks only; project-specific tracks live inside
        # their project (see ProjectService.list_project_tracks).
        return await self.pack_dao.list_general_for_org(org_id, limit=limit, offset=offset)

    async def preview_audience(
        self, org_id: str, assign_to_all: bool, audience_domain_ids: list[str]
    ) -> tuple[int, list[str]]:
        """Dry-run the auto-assign audience for the given targeting rule (Track PRD §assignment preview).

        Returns (count, up-to-5 sample names) so an admin sees who a track will reach before publishing.
        """
        resolved = await self._resolve_audience_domain_ids(org_id, audience_domain_ids)
        employees = await self.employee_dao.list_for_org(org_id, limit=1000)
        if assign_to_all:
            targets = employees
        elif resolved:
            target_set = set(resolved)
            targets = [e for e in employees if e.domain_id is not None and e.domain_id in target_set]
        else:
            targets = []
        return len(targets), [e.name for e in targets[:5]]

    async def get_pack(self, org_id: str, pack_id: str) -> DocPack:
        pack = await self.pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")
        return pack

    async def update_pack(
        self,
        org_id: str,
        pack_id: str,
        *,
        name: str | None = None,
        description: str | None = None,
        domain_id: str | None = None,
        clear_domain: bool = False,
        assign_to_all: bool | None = None,
        audience_domain_ids: list[str] | None = None,
        sequence_order: int | None = None,
        estimated_minutes: int | None = None,
        due_offset_days: int | None = None,
        clear_estimated_minutes: bool = False,
        clear_due_offset_days: bool = False,
    ) -> DocPack:
        pack = await self.get_pack(org_id, pack_id)
        fields: dict = {}
        if name is not None:
            fields["name"] = name.strip()
        if description is not None:
            fields["description"] = description
        if clear_domain:
            fields["domain_id"] = None
        elif domain_id is not None:
            fields["domain_id"] = await self._resolve_domain_id(org_id, domain_id)
        if assign_to_all is not None:
            fields["assign_to_all"] = assign_to_all
        if sequence_order is not None:
            fields["sequence_order"] = sequence_order
        if clear_estimated_minutes:
            fields["estimated_minutes"] = None
        elif estimated_minutes is not None:
            fields["estimated_minutes"] = estimated_minutes
        if clear_due_offset_days:
            fields["due_offset_days"] = None
        elif due_offset_days is not None:
            fields["due_offset_days"] = due_offset_days
        if fields:
            updated = await self.pack_dao.update(pack.id, **fields)
            assert updated is not None
        # audience_domain_ids is None → leave audience unchanged; [] → clear it.
        if audience_domain_ids is not None:
            resolved = await self._resolve_audience_domain_ids(org_id, audience_domain_ids)
            await self.audience_dao.replace_for_pack(org_id, pack.id, resolved)
        return await self.get_pack(org_id, pack_id)

    async def upload_documents(
        self,
        org_id: str,
        pack_id: str,
        files: list[tuple[str, bytes, str | None]],
        created_by: str | None = None,
    ) -> list[DocPackDocument]:
        """Upload files to Supabase Storage and create `doc_pack_document` rows.

        `files` is a list of `(filename, content, content_type)` tuples.
        Caller should schedule `ingest_document_background` for each returned document id.
        """
        pack = await self.get_pack(org_id, pack_id)
        if not files:
            raise ValidationError("At least one file is required")
        if len(files) > MAX_DOC_PACK_FILES_PER_UPLOAD:
            raise ValidationError(f"Too many files — upload at most {MAX_DOC_PACK_FILES_PER_UPLOAD} at a time")

        # Validate every file before touching storage, so a bad file in the batch never leaves
        # earlier files half-ingested.
        for filename, content, _ in files:
            extension = _extension_for(filename)
            if extension not in ALLOWED_DOC_PACK_EXTENSIONS:
                raise ValidationError(f"Unsupported file type: {filename}")
            if not content:
                raise ValidationError(f"Empty file: {filename}")
            if len(content) > MAX_DOC_PACK_FILE_SIZE_BYTES:
                limit_mb = MAX_DOC_PACK_FILE_SIZE_BYTES // (1024 * 1024)
                raise ValidationError(f"{filename} is too large — the limit is {limit_mb} MB per file")

        storage = await self._storage_client()
        created: list[DocPackDocument] = []
        uploaded_paths: list[str] = []

        try:
            for filename, content, content_type in files:
                extension = _extension_for(filename)
                document_id = DocPackDocument.generate_pk()
                safe_name = PurePosixPath(filename).name.replace(" ", "_")
                storage_path = f"{org_id}/{pack.id}/{document_id}-{safe_name}"
                mime = content_type or _CONTENT_TYPES.get(extension, "application/octet-stream")

                await storage.upload(storage_path, content, mime)
                uploaded_paths.append(storage_path)
                document = await self.document_dao.create(
                    id=document_id,
                    doc_pack_id=pack.id,
                    title=PurePosixPath(filename).stem or safe_name,
                    storage_path=storage_path,
                    file_type=extension if extension != "markdown" else "md",
                    file_size_bytes=len(content),
                    status=DocumentStatus.uploaded,
                    created_by=created_by,
                )
                created.append(document)
        except Exception:
            # Best-effort rollback of the partial batch: DB rows first, then storage objects.
            for document in created:
                try:
                    await self.document_dao.delete(document.id)
                except Exception:
                    logger.exception("upload_rollback_row_failed document_id=%s", document.id)
            for path in uploaded_paths:
                try:
                    await storage.delete(path)
                except Exception:
                    logger.exception("upload_rollback_storage_failed path=%s", path)
            raise

        return created

    async def get_ingest_status(self, org_id: str, pack_id: str) -> tuple[list, list[str]]:
        """Lightweight status rows for polling, plus ids of stale documents to requeue.

        Ingestion runs as an in-process background task, so a host restart/OOM mid-ingest strands
        the document in `uploaded`/`processing` with nothing to resume it. Since this endpoint is
        polled anyway, it doubles as the recovery loop: documents that haven't moved within the
        stale window are re-claimed here (bumping `updated_at` so concurrent polls don't double
        -requeue) and returned for the router to reschedule; documents that already burned
        `MAX_DOC_INGEST_ATTEMPTS` are marked failed so the UI stops showing them as in-progress.
        """
        if not await self.pack_dao.exists_for_org(org_id, pack_id):
            raise NotFoundError(f"Doc pack {pack_id} not found")
        rows = await self.document_dao.list_status_for_pack(org_id, pack_id)

        cutoff = datetime.now(UTC) - timedelta(seconds=DOC_INGEST_STALE_AFTER_SECONDS)
        stale = [
            row
            for row in rows
            if row.status in (DocumentStatus.uploaded, DocumentStatus.processing) and row.updated_at < cutoff
        ]
        if not stale:
            return rows, []

        requeue_ids: list[str] = []
        for row in stale:
            if row.ingest_attempts >= MAX_DOC_INGEST_ATTEMPTS:
                await self.document_dao.update(
                    row.id,
                    status=DocumentStatus.failed,
                    error_message="Ingestion was interrupted repeatedly — delete this document and re-upload it.",
                )
                logger.warning("doc_ingest_gave_up document_id=%s attempts=%s", row.id, row.ingest_attempts)
            else:
                await self.document_dao.update(row.id, status=DocumentStatus.processing)
                requeue_ids.append(row.id)
                logger.info("doc_ingest_requeued document_id=%s attempts=%s", row.id, row.ingest_attempts)

        rows = await self.document_dao.list_status_for_pack(org_id, pack_id)
        return rows, requeue_ids

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
    error: str | None = None
    async with factory() as session:
        service = DocPackService(session)
        try:
            count = await service.ingest_document(org_id, document_id)
            logger.info("doc_ingest_ok document_id=%s chunks=%s", document_id, count)
            return
        except Exception as exc:
            logger.exception("doc_ingest_failed document_id=%s", document_id)
            error = str(exc)[:2000]

    # Backstop: if the ingest session was too broken to record the failure itself, mark the
    # document failed from a fresh session so it can't sit in `processing` forever.
    try:
        async with factory() as session:
            await DocPackDocumentDAO(session).update(document_id, status=DocumentStatus.failed, error_message=error)
    except Exception:
        logger.exception("doc_ingest_mark_failed_failed document_id=%s", document_id)


def _extension_for(filename: str) -> str:
    suffix = PurePosixPath(filename).suffix.lower().lstrip(".")
    return suffix
