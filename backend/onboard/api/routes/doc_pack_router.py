from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.doc_pack.request import DocPackCreateRequest, DocPackRetrieveRequest, DocPackUpdateRequest
from onboard.api.schema.doc_pack.response import (
    DocPackDocumentResponse,
    DocPackListItemResponse,
    DocPackResponse,
    DocPackRetrieveResponse,
    RetrievedDocChunkResponse,
)
from onboard.services.doc_pack.doc_pack_service import ingest_document_background

router = APIRouter(prefix="/doc-packs", tags=["doc-packs"])


@router.post("", response_model=DocPackResponse, status_code=201)
async def create_doc_pack(
    payload: DocPackCreateRequest,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
):
    pack = await services.doc_pack.create_pack(org_id=org_id, name=payload.name, description=payload.description)
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
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    services: ServiceContainer = Depends(get_service_container),
):
    payloads: list[tuple[str, bytes, str | None]] = []
    for upload in files:
        content = await upload.read()
        payloads.append((upload.filename or "untitled.txt", content, upload.content_type))

    documents = await services.doc_pack.upload_documents(org_id, pack_id, payloads)
    for document in documents:
        background_tasks.add_task(ingest_document_background, org_id, document.id)
    return documents


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
