from pydantic import BaseModel, Field


class DocPackCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    domain_id: str | None = None


class DocPackUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    # Pass null to clear; omit to leave unchanged (router checks "domain_id" in payload).
    domain_id: str | None = None


class DocPackRetrieveRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=8, ge=1, le=32)
    document_id: str | None = None
