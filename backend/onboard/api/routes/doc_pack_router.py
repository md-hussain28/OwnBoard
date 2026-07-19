from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile

from onboard.api.dependency.auth import ClerkOrgId, ClerkUserId
from onboard.api.dependency.rbac import RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.doc_pack.request import (
    AudiencePreviewRequest,
    DocPackCreateRequest,
    DocPackRetrieveRequest,
    DocPackUpdateRequest,
    RegisterUploadsRequest,
    SignedUploadRequest,
)
from onboard.api.schema.doc_pack.response import (
    AudiencePreviewResponse,
    DocPackDocumentResponse,
    DocPackIngestStatusResponse,
    DocPackListItemResponse,
    DocPackResponse,
    DocPackRetrieveResponse,
    DocumentIngestStatusItem,
    RetrievedDocChunkResponse,
    SignedUploadTargetResponse,
    SignedUploadUrlsResponse,
)
from onboard.api.schema.quiz.request import (
    GenerateDocPackQuizRequest,
    RegenerateQuestionsRequest,
    SaveDocPackQuizRequest,
)
from onboard.api.schema.quiz.response import (
    GenerateDocPackQuizResponse,
    GeneratedSlotIssueResponse,
    QuizTemplateAdminResponse,
)
from onboard.dao.models.doc_pack import DocPack, DocumentStatus
from onboard.services.doc_pack.doc_pack_service import ingest_document_background
from onboard.services.pack_assignment.auto_assign import assign_pack_to_audience

router = APIRouter(prefix="/doc-packs", tags=["doc-packs"])


def _audience_ids(pack: DocPack) -> list[str]:
    return [a.org_domain_id for a in pack.audience_domains]


def _audience_names(pack: DocPack) -> list[str]:
    return [a.org_domain.name for a in pack.audience_domains if a.org_domain is not None]


def _pack_list_item(pack: DocPack) -> DocPackListItemResponse:
    return DocPackListItemResponse(
        id=pack.id,
        org_id=pack.org_id,
        project_id=pack.project_id,
        name=pack.name,
        description=pack.description,
        status=pack.status,
        created_by=pack.created_by,
        created_at=pack.created_at,
        updated_at=pack.updated_at,
        domain_id=pack.domain_id,
        domain_name=pack.domain.name if pack.domain else None,
        assign_to_all=pack.assign_to_all,
        audience_domain_ids=_audience_ids(pack),
        audience_domain_names=_audience_names(pack),
        sequence_order=pack.sequence_order,
        estimated_minutes=pack.estimated_minutes,
        due_offset_days=pack.due_offset_days,
        pass_pct=pack.pass_pct,
    )


def _pack_response(pack: DocPack) -> DocPackResponse:
    return DocPackResponse(
        id=pack.id,
        org_id=pack.org_id,
        project_id=pack.project_id,
        name=pack.name,
        description=pack.description,
        status=pack.status,
        created_by=pack.created_by,
        created_at=pack.created_at,
        updated_at=pack.updated_at,
        domain_id=pack.domain_id,
        domain_name=pack.domain.name if pack.domain else None,
        assign_to_all=pack.assign_to_all,
        audience_domain_ids=_audience_ids(pack),
        audience_domain_names=_audience_names(pack),
        sequence_order=pack.sequence_order,
        estimated_minutes=pack.estimated_minutes,
        due_offset_days=pack.due_offset_days,
        pass_pct=pack.pass_pct,
        documents=[DocPackDocumentResponse.model_validate(d) for d in pack.documents],
    )


@router.post("", response_model=DocPackResponse, status_code=201)
async def create_doc_pack(
    payload: DocPackCreateRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    pack = await services.doc_pack.create_pack(
        org_id=org_id,
        name=payload.name,
        description=payload.description,
        created_by=user_id,
        domain_id=payload.domain_id,
        assign_to_all=payload.assign_to_all,
        audience_domain_ids=payload.audience_domain_ids,
        sequence_order=payload.sequence_order,
        estimated_minutes=payload.estimated_minutes,
        due_offset_days=payload.due_offset_days,
        project_id=payload.project_id,
    )
    return _pack_response(pack)


@router.post("/audience-preview", response_model=AudiencePreviewResponse)
async def preview_audience(
    payload: AudiencePreviewRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Dry-run how many employees a targeting rule would auto-assign to, before publishing (Track PRD)."""
    count, sample = await services.doc_pack.preview_audience(org_id, payload.assign_to_all, payload.audience_domain_ids)
    return AudiencePreviewResponse(count=count, sample_names=sample)


@router.get("", response_model=list[DocPackListItemResponse])
async def list_doc_packs(
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Admin quiz desk — members see assigned packs via /employees/{id}/assignments instead."""
    packs = await services.doc_pack.list_packs(org_id)
    return [_pack_list_item(p) for p in packs]


@router.get("/{pack_id}", response_model=DocPackResponse)
async def get_doc_pack(
    pack_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    return _pack_response(await services.doc_pack.get_pack(org_id, pack_id))


@router.patch("/{pack_id}", response_model=DocPackResponse)
async def update_doc_pack(
    pack_id: str,
    payload: DocPackUpdateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    fields = payload.model_dump(exclude_unset=True)
    clear_domain = "domain_id" in fields and fields.get("domain_id") is None
    domain_id = fields.get("domain_id") if not clear_domain else None
    audience_changed = "assign_to_all" in fields or "audience_domain_ids" in fields
    pack = await services.doc_pack.update_pack(
        org_id,
        pack_id,
        name=fields.get("name"),
        description=fields.get("description"),
        domain_id=domain_id,
        clear_domain=clear_domain,
        assign_to_all=fields.get("assign_to_all"),
        audience_domain_ids=fields.get("audience_domain_ids"),
        sequence_order=fields.get("sequence_order"),
        estimated_minutes=fields.get("estimated_minutes"),
        due_offset_days=fields.get("due_offset_days"),
        clear_estimated_minutes="estimated_minutes" in fields and fields.get("estimated_minutes") is None,
        clear_due_offset_days="due_offset_days" in fields and fields.get("due_offset_days") is None,
    )
    # A widened audience should reach existing employees immediately (only affects published tracks).
    if audience_changed:
        await assign_pack_to_audience(services.session, org_id, pack_id)
        pack = await services.doc_pack.get_pack(org_id, pack_id)
    return _pack_response(pack)


@router.post("/{pack_id}/documents/upload-urls", response_model=SignedUploadUrlsResponse)
async def create_document_upload_urls(
    pack_id: str,
    payload: SignedUploadRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Direct-to-storage upload step 1: mint signed URLs so files go browser → Supabase, sidestepping
    the Vercel serverless ~4.5MB request-body cap a proxied multipart POST would hit. Validates the
    batch (PDF-only, per-file size cap) before handing out any URL."""
    targets = await services.doc_pack.create_upload_urls(
        org_id, pack_id, [(f.filename, f.content_type, f.size) for f in payload.files]
    )
    return SignedUploadUrlsResponse(uploads=[SignedUploadTargetResponse(**t) for t in targets])


@router.post("/{pack_id}/documents/register", response_model=list[DocPackDocumentResponse], status_code=201)
async def register_documents(
    pack_id: str,
    payload: RegisterUploadsRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    _admin: RequireAdmin,
    background_tasks: BackgroundTasks,
    services: ServiceContainer = Depends(get_service_container),
):
    """Step 2: record the objects the browser uploaded and kick off background ingest."""
    documents = await services.doc_pack.register_uploaded_documents(
        org_id,
        pack_id,
        [(f.document_id, f.filename, f.storage_path, f.size) for f in payload.files],
        created_by=user_id,
    )
    for document in documents:
        background_tasks.add_task(ingest_document_background, org_id, document.id)
    return documents


@router.post("/{pack_id}/documents", response_model=list[DocPackDocumentResponse], status_code=201)
async def upload_documents(
    pack_id: str,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    _admin: RequireAdmin,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    services: ServiceContainer = Depends(get_service_container),
):
    payloads: list[tuple[str, bytes, str | None]] = []
    for upload in files:
        content = await upload.read()
        payloads.append((upload.filename or "untitled.txt", content, upload.content_type))

    documents = await services.doc_pack.upload_documents(org_id, pack_id, payloads, created_by=user_id)
    for document in documents:
        background_tasks.add_task(ingest_document_background, org_id, document.id)
    return documents


@router.get("/{pack_id}/documents/status", response_model=DocPackIngestStatusResponse)
async def get_documents_status(
    pack_id: str,
    org_id: ClerkOrgId,  # not CurrentOrgId: this is polled — skip the org get-or-create round trip
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Cheap ingestion-progress poll: column-only query, no document/chunk hydration.

    Ingests killed by a host restart surface as `failed` (see `get_ingest_status`) — nothing is
    restarted automatically; recovery is the explicit retry endpoint below.
    """
    rows = await services.doc_pack.get_ingest_status(org_id, pack_id)
    documents = [
        DocumentIngestStatusItem(
            id=row.id, title=row.title, status=row.status, page_count=row.page_count, error_message=row.error_message
        )
        for row in rows
    ]
    processed = sum(1 for d in documents if d.status == DocumentStatus.processed)
    failed = sum(1 for d in documents if d.status == DocumentStatus.failed)
    pending = len(documents) - processed - failed
    return DocPackIngestStatusResponse(
        pack_id=pack_id,
        total=len(documents),
        processed=processed,
        failed=failed,
        pending=pending,
        is_complete=pending == 0,
        documents=documents,
    )


@router.post("/{pack_id}/documents/{document_id}/retry", response_model=DocPackDocumentResponse, status_code=202)
async def retry_document(
    pack_id: str,
    document_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    background_tasks: BackgroundTasks,
    services: ServiceContainer = Depends(get_service_container),
):
    """Re-run ingestion for a failed document (e.g. after a transient extraction/embedding error)."""
    document = await services.doc_pack.retry_document(org_id, pack_id, document_id)
    background_tasks.add_task(ingest_document_background, org_id, document.id)
    return document


@router.delete("/{pack_id}/documents/{document_id}", status_code=204)
async def delete_document(
    pack_id: str,
    document_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.doc_pack.delete_document(org_id, pack_id, document_id)


@router.post("/{pack_id}/retrieve", response_model=DocPackRetrieveResponse)
async def retrieve_doc_pack(
    pack_id: str,
    payload: DocPackRetrieveRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    hits = await services.rag.retrieve_doc_pack(
        org_id,
        pack_id,
        payload.query,
        top_k=payload.top_k,
        document_id=payload.document_id,
    )
    return DocPackRetrieveResponse(
        chunks=[
            RetrievedDocChunkResponse(
                document_id=hit.chunk.document_id,
                document_title=hit.document_title,
                chunk_index=hit.chunk.chunk_index,
                content=hit.chunk.content,
                score=hit.score,
                page_start=hit.chunk.page_start,
                page_end=hit.chunk.page_end,
                section_title=hit.chunk.section_title,
            )
            for hit in hits
        ]
    )


@router.post("/{pack_id}/generate-quiz", response_model=GenerateDocPackQuizResponse, status_code=201)
async def generate_doc_pack_quiz(
    pack_id: str,
    payload: GenerateDocPackQuizRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Doc Pack PRD §5 — coverage_plan → draft → verify pipeline; returns a curation-ready draft."""
    template, rejected = await services.quiz.generate_doc_pack_quiz(
        org_id, pack_id, payload.target_count, list(payload.formats), payload.custom_instructions
    )
    return GenerateDocPackQuizResponse(
        template=QuizTemplateAdminResponse.model_validate(template),
        rejected_slots=[
            GeneratedSlotIssueResponse(document_title=r.slot.document_title, citation=r.slot.citation, reason=r.reason)
            for r in rejected
        ],
        needs_review=bool(rejected),
    )


@router.post("/{pack_id}/quiz/regenerate-questions", response_model=QuizTemplateAdminResponse)
async def regenerate_quiz_questions(
    pack_id: str,
    payload: RegenerateQuestionsRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Doc Pack PRD §2.1/§6 — regenerate specific dropped question slots within the current draft."""
    return await services.quiz.regenerate_questions(org_id, pack_id, payload.question_ids)


@router.get("/{pack_id}/quiz", response_model=QuizTemplateAdminResponse)
async def get_doc_pack_quiz(
    pack_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Admin view of the latest generated/saved questions, including correct answers (Doc Pack PRD §6)."""
    return await services.quiz.get_admin_quiz(org_id, pack_id)


@router.put("/{pack_id}/quiz", response_model=QuizTemplateAdminResponse)
async def save_doc_pack_quiz(
    pack_id: str,
    payload: SaveDocPackQuizRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Doc Pack PRD §5.5/§5.6 — publish the admin's curated set; pack becomes assignable.

    Publishing is also what makes a track eligible for auto-assignment, so fan out to its
    audience (domain-matched employees, or everyone) right after the quiz goes live.
    """
    curation = [item.model_dump() for item in payload.questions]
    template = await services.quiz.save_curated_quiz(
        org_id, pack_id, curation, open_book=payload.open_book, pass_pct=payload.pass_pct
    )
    await assign_pack_to_audience(services.session, org_id, pack_id)
    return template
