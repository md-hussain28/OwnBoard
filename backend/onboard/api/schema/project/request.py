from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    # Optional link to a connected repo (id) so the member panel can frame go-to people for that codebase.
    repo_id: str | None = None


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    # Pass null to clear the repo link; omit to leave unchanged (router checks "repo_id" in payload).
    repo_id: str | None = None
    # "active" | "archived".
    status: str | None = None


class AddProjectMembersRequest(BaseModel):
    employee_ids: list[str] = Field(min_length=1)
