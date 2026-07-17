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
    status: PackAssignmentStatus
    quiz_template_id: str | None
    completed_at: datetime | None
    acks: list[PackAssignmentAckResponse] = []
    # Hydrated for employee dashboards (members cannot list all packs).
    doc_pack_name: str | None = None


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
    completed_at: datetime | None
    documents: list[AssignmentDocumentStatusResponse]
    quiz_unlocked: bool


class StartQuizResponse(BaseModel):
    """PRD §6 `POST /assignments/{id}/start-quiz` — the new/resumed attempt plus the open-book quiz."""

    attempt: QuizAttemptResponse
    template: QuizTemplateResponse


class AssignmentDocumentContentResponse(BaseModel):
    """Open-book reading text for one document in an assignment (PRD §4)."""

    document_id: str
    title: str
    file_type: str
    content: str
