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
    project_id: str | None = None
    domain_id: str | None = None
    domain_name: str | None = None
    assign_to_all: bool = False
    audience_domain_ids: list[str] = []
    audience_domain_names: list[str] = []
    sequence_order: int = 0
    estimated_minutes: int | None = None
    due_offset_days: int | None = None
    pass_pct: int = 100
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
    project_id: str | None = None
    domain_id: str | None = None
    domain_name: str | None = None
    assign_to_all: bool = False
    audience_domain_ids: list[str] = []
    audience_domain_names: list[str] = []
    sequence_order: int = 0
    estimated_minutes: int | None = None
    due_offset_days: int | None = None
    pass_pct: int = 100


class AudiencePreviewResponse(BaseModel):
    """Dry-run result for the assignment preview — count plus a few sample names for the admin UI."""

    count: int
    sample_names: list[str] = []


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


class SignedUploadTargetResponse(BaseModel):
    """A single-use target the browser PUTs one file to, plus the ids needed to register it after."""

    document_id: str
    filename: str
    storage_path: str
    upload_url: str
    token: str
    content_type: str


class SignedUploadUrlsResponse(BaseModel):
    uploads: list[SignedUploadTargetResponse]
