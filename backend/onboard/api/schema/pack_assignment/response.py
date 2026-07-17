from datetime import datetime

from pydantic import BaseModel, ConfigDict

from onboard.api.schema.quiz.response import QuizAttemptResponse, QuizTemplateResponse
from onboard.dao.models.doc_pack import PackAssignmentStatus


class PackAssignmentAckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: str
    acknowledged_at: datetime


class PackAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    doc_pack_id: str
    employee_id: str
    assigned_by: str | None
    assigned_at: datetime
    due_at: datetime | None = None
    status: PackAssignmentStatus
    quiz_template_id: str | None
    completed_at: datetime | None
    acks: list[PackAssignmentAckResponse] = []
    # Hydrated for employee dashboards (members cannot list all packs).
    doc_pack_name: str | None = None
    # Hard-lock sequencing — set on the employee assignment list / detail.
    locked: bool = False
    locked_by_name: str | None = None
    # Pack-derived helpers for the employee card (time estimate + pass bar).
    estimated_minutes: int | None = None
    pass_pct: int | None = None


class AssignmentOutcomeResponse(BaseModel):
    """One pass/fail event for the org-admin inbox."""

    id: str
    doc_pack_id: str
    doc_pack_name: str
    employee_id: str
    employee_name: str
    status: PackAssignmentStatus
    assigned_at: datetime
    completed_at: datetime | None
    updated_at: datetime


class AssignmentDocumentStatusResponse(BaseModel):
    """One document in an assignment's reading list, with the employee's ack state (PRD §4/§6)."""

    id: str
    title: str
    file_type: str
    status: str
    acknowledged_at: datetime | None


class PackAssignmentDetailResponse(BaseModel):
    """PRD §6 `GET /assignments/{id}` — documents + ack state + unlocked flag for the read-gate."""

    id: str
    doc_pack_id: str
    doc_pack_name: str
    employee_id: str
    status: PackAssignmentStatus
    quiz_template_id: str | None
    assigned_at: datetime
    due_at: datetime | None = None
    completed_at: datetime | None
    documents: list[AssignmentDocumentStatusResponse]
    quiz_unlocked: bool
    locked: bool = False
    locked_by_name: str | None = None
    estimated_minutes: int | None = None
    pass_pct: int | None = None


class AssignmentDocumentContentResponse(BaseModel):
    """Reading payload for one document in an assignment (PRD §4).

    `content` is extracted plain text for text-like files (empty for PDFs).
    `file_url` is a short-lived Supabase signed URL so the browser can load the PDF
    directly from storage (no backend byte proxy).
    """

    document_id: str
    title: str
    file_type: str
    content: str
    file_url: str | None = None


class StartQuizResponse(BaseModel):
    """PRD §6 `POST /assignments/{id}/start-quiz` — the new/resumed attempt plus the quiz template."""

    attempt: QuizAttemptResponse
    template: QuizTemplateResponse


class CohortTrackResponse(BaseModel):
    """One column in the cohort completion matrix."""

    id: str
    name: str
    sequence_order: int


class CohortEmployeeRowResponse(BaseModel):
    """One employee row in the cohort matrix — status per track plus their own progress."""

    employee_id: str
    employee_name: str
    # track_id -> status (absent key means the track isn't assigned to this employee).
    cells: dict[str, PackAssignmentStatus]
    passed_count: int
    total_count: int


class CohortDashboardResponse(BaseModel):
    """Admin onboarding overview (Track PRD §cohort dashboard): who's stuck + time-to-onboard."""

    tracks: list[CohortTrackResponse]
    employees: list[CohortEmployeeRowResponse]
    total_assignments: int
    passed_assignments: int
    overdue_assignments: int
    not_started_assignments: int
    completion_pct: int
    # Mean days from first assignment to finishing every assigned track, over fully-onboarded employees.
    avg_days_to_onboard: float | None = None
    fully_onboarded_count: int = 0
