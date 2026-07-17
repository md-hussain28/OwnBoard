from pydantic import BaseModel, Field

from onboard.config.constants import APP_ROLE_MEMBER


class EmployeeCreateRequest(BaseModel):
    name: str
    role: str | None = None
    github_handle: str | None = None
    app_role: str = APP_ROLE_MEMBER
    domain_id: str | None = None


class EmployeeUpdateRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    github_handle: str | None = None
    app_role: str | None = None
    # Pass null to clear; omit to leave unchanged — use a sentinel via model if needed.
    # For PATCH we treat explicit null as clear by accepting Optional and checking "domain_id" in payload
    # at the router... Simpler: accept Optional and use a separate approach in service with UNSET.
    domain_id: str | None = None


class EmployeeInviteRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    app_role: str = APP_ROLE_MEMBER
    # Optional profile applied when the invitee joins (via Clerk invitation metadata).
    role: str | None = None  # job title
    github_handle: str | None = None
    domain_id: str | None = None
