from datetime import datetime

from pydantic import BaseModel


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
    repo_id: str | None
    repo_name: str | None
    created_by: str | None
    created_at: datetime
    updated_at: datetime
    member_count: int
    track_count: int


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


class ProjectMemberResponse(BaseModel):
    """One row of a project's member panel — the person plus their readiness and GitHub handle."""

    employee_id: str
    name: str
    role: str | None  # job title
    app_role: str
    github_handle: str | None
    domain_name: str | None
    readiness: ProjectReadiness
    # True once they've passed every project track — the documented go-to person for this project/repo.
    is_go_to: bool


class ProjectDetailResponse(ProjectResponse):
    repo_url: str | None
    tracks: list[ProjectTrackResponse]
    # Present when the viewer is a member of the project (their own lock/progress); None for admins
    # who aren't members.
    my_readiness: ProjectReadiness | None
    is_member: bool
    # True when the viewer is an org admin (drives whether the management UI shows).
    is_admin: bool
    # Whether the project is currently locked for the viewer (false for admins / non-members).
    locked: bool
