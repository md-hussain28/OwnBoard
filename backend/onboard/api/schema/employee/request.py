from pydantic import BaseModel


class EmployeeCreateRequest(BaseModel):
    org_id: str
    name: str
    role: str | None = None
    github_handle: str | None = None
