from datetime import datetime

from pydantic import BaseModel


class ResourceLink(BaseModel):
    label: str
    url: str


class GlossaryTerm(BaseModel):
    term: str
    definition: str


class ProjectRepoResponse(BaseModel):
    """One repository linked to a project."""

    repo_id: str
    name: str | None
    url: str | None
    is_primary: bool


class ProjectFunctionTypeResponse(BaseModel):
    """A per-project, configurable function (Frontend, Backend, …) used for module auto-assign."""

    id: str
    name: str
    sort_order: int
    member_count: int = 0
    module_count: int = 0


class ProjectReadiness(BaseModel):
    """A member's onboarding standing for one project. `locked` means at least one project track
    is still unpassed — entry to the project is gated until every project track is passed."""

    locked: bool
    total_tracks: int  # gating tracks the member has been assigned (published project tracks)
    passed_tracks: int
    in_progress_tracks: int
    progress_pct: int


class ProjectResponse(BaseModel):
    id: str
    org_id: str
    name: str
    description: str | None
    status: str
    repo_id: str | None  # primary repo (legacy pointer)
    repo_name: str | None
    repos: list[ProjectRepoResponse] = []
    tech_stack: list[str] = []
    resource_links: list[ResourceLink] = []
    glossary: list[GlossaryTerm] = []
    created_by: str | None
    created_at: datetime
    updated_at: datetime
    member_count: int
    track_count: int
    module_count: int = 0


class MyProjectResponse(ProjectResponse):
    """A project card on the member's 'My projects' surface, with their lock/progress state."""

    readiness: ProjectReadiness


class ProjectTrackResponse(BaseModel):
    """A project-specific track, annotated with the current viewer's progress on it."""

    id: str
    name: str
    description: str | None
    status: str
    sequence_order: int
    estimated_minutes: int | None
    due_offset_days: int | None  # days after assignment the track is due; null = no deadline
    # Viewer-specific: their assignment for this track (if any) and whether they've passed it.
    assignment_id: str | None
    my_status: str  # PackAssignmentStatus value, or "not_assigned"
    passed: bool


class ProjectModuleResponse(BaseModel):
    """A dev-facing project module (distinct from gating tracks), with viewer-specific progress."""

    id: str
    name: str
    description: str | None
    content: str | None
    resource_links: list[ResourceLink] = []
    status: str
    sequence_order: int
    estimated_minutes: int | None
    function_type_ids: list[str] = []
    function_type_names: list[str] = []
    assigned_count: int = 0  # how many members it's assigned to (management view)
    # Viewer-specific (present for members): their assignment status on this module.
    my_status: str = "not_assigned"  # ProjectModuleAssignmentStatus value, or "not_assigned"
    my_completed: bool = False


class ProjectMemberResponse(BaseModel):
    """One row of a project's member panel — the person plus their readiness, role and GitHub handle."""

    employee_id: str
    name: str
    role: str | None  # job title
    app_role: str
    github_handle: str | None
    domain_name: str | None
    is_lead: bool = False
    function_type_id: str | None = None
    function_type_name: str | None = None
    readiness: ProjectReadiness
    # True once they've passed every project track — the documented go-to person for this project/repo.
    is_go_to: bool


class ProjectDetailResponse(ProjectResponse):
    repo_url: str | None
    tracks: list[ProjectTrackResponse]
    function_types: list[ProjectFunctionTypeResponse] = []
    # Modules the viewer should see: all modules for a manager, the viewer's assigned modules for a member.
    modules: list[ProjectModuleResponse] = []
    # Present when the viewer is a member of the project (their own lock/progress); None for admins
    # who aren't members.
    my_readiness: ProjectReadiness | None
    is_member: bool
    # True when the viewer is an org admin (drives whether the org-wide management UI shows).
    is_admin: bool
    # True when the viewer is the project's team lead (scoped admin over this project).
    my_is_lead: bool = False
    # True when the viewer can manage this project (org admin OR this project's team lead).
    can_manage: bool = False
    # Whether the project is currently locked for the viewer (false for admins / non-members).
    locked: bool
