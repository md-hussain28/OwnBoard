from fastapi import APIRouter, Depends

from onboard.api.dependency.auth import ClerkUserId
from onboard.api.dependency.rbac import CurrentEmployee, RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.pack_assignment.request import CreateAssignmentsRequest
from onboard.api.schema.pack_assignment.response import (
    AssignmentDocumentContentResponse,
    AssignmentDocumentStatusResponse,
    AssignmentOutcomeResponse,
    PackAssignmentDetailResponse,
    PackAssignmentResponse,
    StartQuizResponse,
)
from onboard.api.schema.quiz.response import QuizAttemptResponse, QuizTemplateResponse

router = APIRouter(tags=["pack-assignments"])


@router.post("/doc-packs/{pack_id}/assignments", response_model=list[PackAssignmentResponse], status_code=201)
async def create_assignments(
    pack_id: str,
    payload: CreateAssignmentsRequest,
    org_id: CurrentOrgId,
    assigned_by: ClerkUserId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Doc Pack PRD §6/§10.10 — manual multi-select assign only."""
    return await services.pack_assignment.create_assignments(org_id, pack_id, payload.employee_ids, assigned_by)


@router.get("/doc-packs/{pack_id}/assignments", response_model=list[PackAssignmentResponse])
async def list_pack_assignments(
    pack_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.pack_assignment.list_for_pack(org_id, pack_id)


@router.delete("/assignments/{assignment_id}", status_code=204)
async def revoke_assignment(
    assignment_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Doc Pack PRD §10.15 — allowed unless the assignment has already passed."""
    await services.pack_assignment.revoke_assignment(org_id, assignment_id)


@router.get("/employees/{employee_id}/assignments", response_model=list[PackAssignmentResponse])
async def list_employee_assignments(
    employee_id: str,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Employee dashboard — assigned packs + status ("tests left") (Doc Pack PRD §7).

    Members may only list their own assignments; admins may list any employee.
    """
    rows = await services.pack_assignment.list_for_employee(org_id, employee_id, actor=actor)
    return [
        PackAssignmentResponse.model_validate(assignment).model_copy(update={"doc_pack_name": pack_name})
        for assignment, pack_name in rows
    ]


@router.get("/assignments/outcomes", response_model=list[AssignmentOutcomeResponse])
async def list_assignment_outcomes(
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Org-admin inbox — recent quiz pass/fail outcomes across the workspace."""
    assignments = await services.pack_assignment.list_recent_outcomes(org_id)
    return [
        AssignmentOutcomeResponse(
            id=a.id,
            doc_pack_id=a.doc_pack_id,
            doc_pack_name=a.doc_pack.name if a.doc_pack else "Quiz pack",
            employee_id=a.employee_id,
            employee_name=a.employee.name if a.employee else "Team member",
            status=a.status,
            assigned_at=a.assigned_at,
            completed_at=a.completed_at,
            updated_at=a.updated_at,
        )
        for a in assignments
    ]


@router.get("/assignments/{assignment_id}", response_model=PackAssignmentDetailResponse)
async def get_assignment_detail(
    assignment_id: str,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Documents + ack state + unlocked flag for the read-gate (Doc Pack PRD §4/§6)."""
    detail = await services.pack_assignment.get_assignment_detail(org_id, assignment_id, actor=actor)
    return PackAssignmentDetailResponse(
        id=detail.assignment.id,
        doc_pack_id=detail.assignment.doc_pack_id,
        doc_pack_name=detail.doc_pack_name,
        employee_id=detail.assignment.employee_id,
        status=detail.assignment.status,
        quiz_template_id=detail.assignment.quiz_template_id,
        assigned_at=detail.assignment.assigned_at,
        completed_at=detail.assignment.completed_at,
        documents=[
            AssignmentDocumentStatusResponse(
                id=doc.id,
                title=doc.title,
                file_type=doc.file_type,
                status=doc.status.value,
                acknowledged_at=acked_at,
            )
            for doc, acked_at in detail.documents
        ],
        quiz_unlocked=detail.quiz_unlocked,
    )


@router.get(
    "/assignments/{assignment_id}/documents/{document_id}/content",
    response_model=AssignmentDocumentContentResponse,
)
async def get_assignment_document_content(
    assignment_id: str,
    document_id: str,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Open-book reading text for one assigned document (Doc Pack PRD §4)."""
    content = await services.pack_assignment.get_document_content(org_id, assignment_id, document_id, actor=actor)
    return AssignmentDocumentContentResponse(
        document_id=content.document_id,
        title=content.title,
        file_type=content.file_type,
        content=content.content,
    )


@router.post("/assignments/{assignment_id}/documents/{document_id}/ack", response_model=PackAssignmentResponse)
async def ack_document(
    assignment_id: str,
    document_id: str,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Per-document "I've read this" gate — server-enforced, not just a UI lock (Doc Pack PRD §10.9)."""
    return await services.pack_assignment.ack_document(org_id, assignment_id, document_id, actor=actor)


@router.post("/assignments/{assignment_id}/start-quiz", response_model=StartQuizResponse, status_code=201)
async def start_quiz(
    assignment_id: str,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """403s server-side if not all documents are acked yet (Doc Pack PRD §4)."""
    attempt, template = await services.pack_assignment.start_quiz(org_id, assignment_id, actor=actor)
    return StartQuizResponse(
        attempt=QuizAttemptResponse.model_validate(attempt),
        template=QuizTemplateResponse.model_validate(template),
    )
