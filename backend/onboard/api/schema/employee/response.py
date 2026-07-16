from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    name: str
    role: str | None
    github_handle: str | None
    created_at: datetime
    updated_at: datetime
