from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile

from onboard.api.dependency.auth import ClerkOrgId, ClerkUserId
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.doc_pack.request import DocPackCreateRequest, DocPackRetrieveRequest, DocPackUpdateRequest
from onboard.api.schema.doc_pack.response import (
    DocPackDocumentResponse,
    DocPackIngestStatusResponse,
    DocPackListItemResponse,
    DocPackResponse,
    DocPackRetrieveResponse,
    DocumentIngestStatusItem,
    RetrievedDocChunkResponse,
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
from onboard.dao.models.doc_pack import DocumentStatus
from onboard.services.doc_pack.doc_pack_service import ingest_document_background

router = APIRouter(prefix="/doc-packs", tags=["doc-packs"])


@router.post("", response_model=DocPackResponse, status_code=201)
async def create_doc_pack(
    payload: DocPackCreateRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    services: ServiceContainer = Depends(get_service_container),
):
    pack = await services.doc_pack.create_pack(
        org_id=org_id, name=payload.name, description=payload.description, created_by=user_id
    )
    return await services.doc_pack.get_pack(org_id, pack.id)


@router.get("", response_model=list[DocPackListItemResponse])
async def list_doc_packs(org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)):
    return await services.doc_pack.list_packs(org_id)


@router.get("/{pack_id}", response_model=DocPackResponse)
async def get_doc_pack(pack_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)):
    return await services.doc_pack.get_pack(org_id, pack_id)


@router.patch("/{pack_id}", response_model=DocPackResponse)
async def update_doc_pack(
    pack_id: str,
    payload: DocPackUpdateRequest,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.doc_pack.update_pack(org_id, pack_id, name=payload.name, description=payload.description)


@router.post("/{pack_id}/documents", response_model=list[DocPackDocumentResponse], status_code=201)
async def upload_documents(
    pack_id: str,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
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
    services: ServiceContainer = Depends(get_service_container),
):
    """Cheap ingestion-progress poll: column-only query, no document/chunk hydration."""
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


@router.delete("/{pack_id}/documents/{document_id}", status_code=204)
async def delete_document(
    pack_id: str,
    document_id: str,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.doc_pack.delete_document(org_id, pack_id, document_id)


@router.post("/{pack_id}/retrieve", response_model=DocPackRetrieveResponse)
async def retrieve_doc_pack(
    pack_id: str,
    payload: DocPackRetrieveRequest,
    org_id: CurrentOrgId,
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
    services: ServiceContainer = Depends(get_service_container),
):
    """Doc Pack PRD §2.1/§6 — regenerate specific dropped question slots within the current draft."""
    return await services.quiz.regenerate_questions(org_id, pack_id, payload.question_ids)


@router.get("/{pack_id}/quiz", response_model=QuizTemplateAdminResponse)
async def get_doc_pack_quiz(
    pack_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)
):
    """Admin view of the latest generated/saved questions, including correct answers (Doc Pack PRD §6)."""
    return await services.quiz.get_admin_quiz(org_id, pack_id)


@router.put("/{pack_id}/quiz", response_model=QuizTemplateAdminResponse)
async def save_doc_pack_quiz(
    pack_id: str,
    payload: SaveDocPackQuizRequest,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
):
    """Doc Pack PRD §5.5/§5.6 — publish the admin's curated set; pack becomes assignable."""
    curation = [item.model_dump() for item in payload.questions]
    return await services.quiz.save_curated_quiz(org_id, pack_id, curation)
