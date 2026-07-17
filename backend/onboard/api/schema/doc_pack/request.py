from pydantic import BaseModel, Field


class DocPackCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    domain_id: str | None = None
    # Audience for auto-assignment: everyone in the org, or the listed employee OrgDomains.
    assign_to_all: bool = False
    audience_domain_ids: list[str] = Field(default_factory=list)
    # Onboarding sequence position (0-based) and per-track policy for time estimate / due date.
    sequence_order: int = Field(default=0, ge=0)
    estimated_minutes: int | None = Field(default=None, ge=1)
    due_offset_days: int | None = Field(default=None, ge=0)


class DocPackUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    # Pass null to clear; omit to leave unchanged (router checks "domain_id" in payload).
    domain_id: str | None = None
    # Omit to leave unchanged. assign_to_all is a plain bool toggle; audience_domain_ids replaces the
    # full set ([] clears it).
    assign_to_all: bool | None = None
    audience_domain_ids: list[str] | None = None
    sequence_order: int | None = Field(default=None, ge=0)
    estimated_minutes: int | None = Field(default=None, ge=1)
    due_offset_days: int | None = Field(default=None, ge=0)


class AudiencePreviewRequest(BaseModel):
    """Dry-run: how many employees a given targeting rule would auto-assign to (before publishing)."""

    assign_to_all: bool = False
    audience_domain_ids: list[str] = Field(default_factory=list)


class DocPackRetrieveRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=8, ge=1, le=32)
    document_id: str | None = None
