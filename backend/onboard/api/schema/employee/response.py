from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    clerk_user_id: str | None = None
    name: str
    role: str | None
    app_role: str
    github_handle: str | None
    domain_id: str | None = None
    domain_name: str | None = None
    created_at: datetime
    updated_at: datetime


class EmployeeInvitationResponse(BaseModel):
    id: str
    email_address: str
    app_role: str
    status: str
