from datetime import datetime

from pydantic import BaseModel, ConfigDict

from onboard.dao.models.doc_pack import DocPackStatus, DocumentStatus


class DocPackDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    doc_pack_id: str
    title: str
    storage_path: str
    file_type: str
    file_size_bytes: int
    status: DocumentStatus
    page_count: int | None
    error_message: str | None
    created_by: str | None
    created_at: datetime
    updated_at: datetime


class DocumentIngestStatusItem(BaseModel):
    """One document's ingestion state — column-only projection, cheap to poll."""

    id: str
    title: str
    status: DocumentStatus
    page_count: int | None
    error_message: str | None


class DocPackIngestStatusResponse(BaseModel):
    """Aggregate ingestion progress for a pack. `is_complete` means nothing is queued or processing."""

    pack_id: str
    total: int
    processed: int
    failed: int
    pending: int
    is_complete: bool
    documents: list[DocumentIngestStatusItem]


class DocPackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    name: str
    description: str | None
    status: DocPackStatus
    created_by: str | None
    created_at: datetime
    updated_at: datetime
    documents: list[DocPackDocumentResponse] = []


class DocPackListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    name: str
    description: str | None
    status: DocPackStatus
    created_by: str | None
    created_at: datetime
    updated_at: datetime


class RetrievedDocChunkResponse(BaseModel):
    document_id: str
    document_title: str
    chunk_index: int
    content: str
    score: float
    page_start: int | None
    page_end: int | None
    section_title: str | None


class DocPackRetrieveResponse(BaseModel):
    chunks: list[RetrievedDocChunkResponse]
