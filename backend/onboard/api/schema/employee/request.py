from pydantic import BaseModel, Field

from onboard.config.constants import APP_ROLE_MEMBER


class EmployeeCreateRequest(BaseModel):
    name: str
    role: str | None = None
    github_handle: str | None = None
    app_role: str = APP_ROLE_MEMBER


class EmployeeUpdateRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    github_handle: str | None = None
    app_role: str | None = None


class EmployeeInviteRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    app_role: str = APP_ROLE_MEMBER
