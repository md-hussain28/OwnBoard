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
    # Optional employee to add as the project's team lead at creation time (a scoped admin).
    lead_employee_id: str | None = None
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


class TrackRepoRuleInput(BaseModel):
    """A repo-scoped targeting rule: everyone assigned to `repo_id`, optionally narrowed to `domain_id`
    (a project function-type id). `repo_id` is a connected-repo id linked to the project."""

    repo_id: str
    domain_id: str | None = None


class TrackAssignmentRequest(BaseModel):
    """Set a project module's combinable audience. The final assignee set is the UNION of:
    every project member (if target_all_members), the members of `domain_ids`, the members matched by
    `repo_rules`, and the hand-picked `manual_employee_ids` (all restricted to project members)."""

    target_all_members: bool = False
    domain_ids: list[str] = Field(default_factory=list)  # project function-type ids
    repo_rules: list[TrackRepoRuleInput] = Field(default_factory=list)
    manual_employee_ids: list[str] = Field(default_factory=list)


class AddProjectRepoRequest(BaseModel):
    # Link an existing connected repo by id, OR provide a URL (+ optional name) to register a new one.
    repo_id: str | None = None
    url: str | None = None
    name: str | None = None
    is_primary: bool = False


class RepoMembersRequest(BaseModel):
    """Set exactly which project members are assigned to work on a linked repo."""

    employee_ids: list[str] = Field(default_factory=list)


class DocTypeCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    sort_order: int = 0


class DocUpdateRequest(BaseModel):
    """Partial edit of a KB document's metadata. `None` means "leave unchanged"; an empty
    description clears it; `type_ids`/`repo_ids` reconcile the links to exactly the given ids."""

    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    type_ids: list[str] | None = None
    repo_ids: list[str] | None = None


class SetDocTypesRequest(BaseModel):
    """Set a document's type tags to exactly these project doc-type ids."""

    type_ids: list[str] = Field(default_factory=list)


class SetDocReposRequest(BaseModel):
    """Attach a document to exactly these repos (project-linked repo ids)."""

    repo_ids: list[str] = Field(default_factory=list)


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
