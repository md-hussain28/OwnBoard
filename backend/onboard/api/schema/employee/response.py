from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    clerk_user_id: str | None = None
    name: str
    role: str | None
    github_handle: str | None
    created_at: datetime
    updated_at: datetime
