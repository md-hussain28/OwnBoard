from pydantic import BaseModel


class EmployeeCreateRequest(BaseModel):
    name: str
    role: str | None = None
    github_handle: str | None = None
