from pydantic import BaseModel, Field


class ResourceLinkInput(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=2048)


class GlossaryTermInput(BaseModel):
    term: str = Field(min_length=1, max_length=255)
    definition: str = Field(min_length=1, max_length=4000)


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    # Lifecycle stage: not_started | active | paused | completed | abandoned. Defaults to active.
    status: str | None = None
    # Optional link to a connected repo (id) so the member panel can frame go-to people for that codebase.
    repo_id: str | None = None
    tech_stack: list[str] | None = None
    resource_links: list[ResourceLinkInput] | None = None
    glossary: list[GlossaryTermInput] | None = None


class ProjectUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    # Pass null to clear the repo link; omit to leave unchanged (router checks "repo_id" in payload).
    repo_id: str | None = None
    # Lifecycle stage: not_started | active | paused | completed | abandoned.
    status: str | None = None
    # Hide/unhide from the default project list (independent of lifecycle status).
    is_archived: bool | None = None
    tech_stack: list[str] | None = None
    resource_links: list[ResourceLinkInput] | None = None
    glossary: list[GlossaryTermInput] | None = None


class AddProjectMembersRequest(BaseModel):
    employee_ids: list[str] = Field(min_length=1)
    # Optional function assigned to every added member — drives module auto-assign.
    function_type_id: str | None = None


class UpdateProjectMemberRequest(BaseModel):
    """Set a member's function and/or team-lead status. Omitted fields are left unchanged."""

    function_type_id: str | None = None
    clear_function_type: bool = False
    is_lead: bool | None = None


class AddProjectRepoRequest(BaseModel):
    # Link an existing connected repo by id, OR provide a URL (+ optional name) to register a new one.
    repo_id: str | None = None
    url: str | None = None
    name: str | None = None
    is_primary: bool = False


class FunctionTypeCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    sort_order: int = 0


class FunctionTypeUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    sort_order: int | None = None


class ProjectModuleCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    content: str | None = None
    resource_links: list[ResourceLinkInput] | None = None
    function_type_ids: list[str] | None = None
    sequence_order: int = 0
    estimated_minutes: int | None = None
    # "draft" | "active" | "archived" — defaults to draft.
    status: str | None = None


class ModuleProgressRequest(BaseModel):
    # "assigned" | "in_progress" | "completed"
    status: str = Field(min_length=1)


class ProjectModuleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    content: str | None = None
    resource_links: list[ResourceLinkInput] | None = None
    function_type_ids: list[str] | None = None
    sequence_order: int | None = None
    estimated_minutes: int | None = None
    status: str | None = None
