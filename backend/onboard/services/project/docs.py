"""Project Docs — the reference knowledge base: uploaded, typed documents that feed 'Ask project'.

Docs live in a single per-project knowledge-base DocPack (`is_knowledge_base=True`), so the whole
existing upload → extract → chunk → embed pipeline (Supabase + `DocChunk`) is reused unchanged and the
chunks are already retrievable via `DocChunkDAO.similarity_search_for_project`. Custom per-project types
(PRD, KT, …) tag documents many-to-many via `ProjectDocumentType`."""

from onboard.api.schema.project.response import (
    ProjectDocResponse,
    ProjectDocsResponse,
    ProjectDocTypeResponse,
)
from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.dao.doc_pack_dao import DocPackDocumentDAO
from onboard.dao.models.doc_pack import DocPack, DocPackStatus
from onboard.dao.models.employee import Employee
from onboard.dao.project_dao import ProjectDocTypeDAO, ProjectDocumentTypeDAO
from onboard.services.doc_pack.doc_pack_service import DocPackService
from onboard.services.project.base import ProjectServiceBase


class ProjectDocsMixin(ProjectServiceBase):
    # ---- helpers -----------------------------------------------------------

    async def _ensure_kb_pack(self, org_id: str, project_id: str) -> DocPack:
        """Get (or lazily create) the project's single knowledge-base pack."""
        pack = await self.pack_dao.get_kb_for_project(org_id, project_id)
        if pack is None:
            pack = await self.pack_dao.create(
                org_id=org_id,
                project_id=project_id,
                name="Project knowledge base",
                status=DocPackStatus.active,
                is_knowledge_base=True,
            )
        return pack

    async def _assert_member_or_admin(self, project_id: str, viewer: Employee) -> None:
        if viewer.app_role == APP_ROLE_ADMIN:
            return
        if await self.member_dao.get_for_project_and_employee(project_id, viewer.id) is None:
            raise ForbiddenError("You are not a member of this project")

    # ---- reads -------------------------------------------------------------

    async def get_docs(self, org_id: str, project_id: str, viewer: Employee) -> ProjectDocsResponse:
        await self._get_project(org_id, project_id)
        await self._assert_member_or_admin(project_id, viewer)
        pack = await self._ensure_kb_pack(org_id, project_id)

        document_dao = DocPackDocumentDAO(self.session)
        type_dao = ProjectDocTypeDAO(self.session)
        link_dao = ProjectDocumentTypeDAO(self.session)

        documents = await document_dao.list_for_pack(pack.id)
        types = await type_dao.list_for_project(project_id)
        type_name_by_id = {t.id: t.name for t in types}
        links = await link_dao.list_for_documents([d.id for d in documents])
        type_ids_by_doc: dict[str, list[str]] = {}
        for link in links:
            type_ids_by_doc.setdefault(link.document_id, []).append(link.doc_type_id)

        return ProjectDocsResponse(
            pack_id=pack.id,
            documents=[self._doc_response(d, type_ids_by_doc.get(d.id, []), type_name_by_id) for d in documents],
            types=[ProjectDocTypeResponse(id=t.id, name=t.name, sort_order=t.sort_order) for t in types],
        )

    @staticmethod
    def _doc_response(document, type_ids: list[str], type_name_by_id: dict[str, str]) -> ProjectDocResponse:
        return ProjectDocResponse(
            id=document.id,
            title=document.title,
            file_type=document.file_type,
            status=document.status.value,
            page_count=document.page_count,
            error_message=document.error_message,
            created_at=document.created_at,
            type_ids=type_ids,
            type_names=[type_name_by_id[t] for t in type_ids if t in type_name_by_id],
        )

    # ---- documents ---------------------------------------------------------

    async def upload_docs(
        self,
        org_id: str,
        project_id: str,
        viewer: Employee,
        files: list[tuple[str, bytes, str | None]],
        created_by: str | None,
    ) -> list:
        """Upload reference files into the project KB pack. Returns the created DocPackDocuments so the
        router can schedule background ingest (extract → chunk → embed), exactly like doc-pack uploads."""
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        pack = await self._ensure_kb_pack(org_id, project_id)
        return await DocPackService(self.session).upload_documents(org_id, pack.id, files, created_by=created_by)

    async def create_doc_upload_urls(
        self,
        org_id: str,
        project_id: str,
        viewer: Employee,
        files: list[tuple[str, str | None, int]],
    ) -> list[dict]:
        """Step 1 of a browser upload into the project KB pack — mint signed upload URLs so the file
        bytes go straight to Supabase (bypassing the Vercel request-body cap). See
        `DocPackService.create_upload_urls`."""
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        pack = await self._ensure_kb_pack(org_id, project_id)
        return await DocPackService(self.session).create_upload_urls(org_id, pack.id, files)

    async def register_uploaded_docs(
        self,
        org_id: str,
        project_id: str,
        viewer: Employee,
        items: list[tuple[str, str, str, int]],
        created_by: str | None,
    ) -> list:
        """Step 2: register the objects the browser uploaded and return the created DocPackDocuments
        so the router can schedule ingest. See `DocPackService.register_uploaded_documents`."""
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        pack = await self._ensure_kb_pack(org_id, project_id)
        return await DocPackService(self.session).register_uploaded_documents(
            org_id, pack.id, items, created_by=created_by
        )

    async def delete_doc(self, org_id: str, project_id: str, viewer: Employee, document_id: str) -> None:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        pack = await self._ensure_kb_pack(org_id, project_id)
        await DocPackService(self.session).delete_document(org_id, pack.id, document_id)

    async def set_document_types(
        self, org_id: str, project_id: str, viewer: Employee, document_id: str, type_ids: list[str]
    ) -> ProjectDocsResponse:
        """Reconcile a document's type tags to exactly `type_ids` (project types only)."""
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        pack = await self._ensure_kb_pack(org_id, project_id)

        document_dao = DocPackDocumentDAO(self.session)
        if await document_dao.get_by_id_for_pack(pack.id, document_id) is None:
            raise NotFoundError(f"Document {document_id} not found")

        type_dao = ProjectDocTypeDAO(self.session)
        link_dao = ProjectDocumentTypeDAO(self.session)
        valid = {t.id for t in await type_dao.list_for_project(project_id)}
        target = {t for t in type_ids if t in valid}
        current = {link.doc_type_id: link for link in await link_dao.list_for_document(document_id)}
        for type_id in target - set(current):
            await link_dao.create(org_id=org_id, document_id=document_id, doc_type_id=type_id)
        for type_id, link in current.items():
            if type_id not in target:
                await link_dao.delete(link.id)
        return await self.get_docs(org_id, project_id, viewer)

    # ---- types -------------------------------------------------------------

    async def create_doc_type(
        self, org_id: str, project_id: str, viewer: Employee, name: str, sort_order: int = 0
    ) -> ProjectDocTypeResponse:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        cleaned = " ".join(name.split()).strip()
        if not cleaned:
            raise ValidationError("Type name cannot be empty")
        type_dao = ProjectDocTypeDAO(self.session)
        for existing in await type_dao.list_for_project(project_id):
            if existing.name.lower() == cleaned.lower():
                raise ValidationError(f"A type named '{cleaned}' already exists")
        created = await type_dao.create(org_id=org_id, project_id=project_id, name=cleaned, sort_order=sort_order)
        return ProjectDocTypeResponse(id=created.id, name=created.name, sort_order=created.sort_order)

    async def delete_doc_type(self, org_id: str, project_id: str, viewer: Employee, doc_type_id: str) -> None:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        type_dao = ProjectDocTypeDAO(self.session)
        doc_type = await type_dao.get_by_id_for_project(project_id, doc_type_id)
        if doc_type is None:
            raise NotFoundError(f"Type {doc_type_id} not found")
        await type_dao.delete(doc_type.id)  # document links cascade
