from fastapi import APIRouter, Depends

from onboard.api.dependency.rbac import CurrentEmployee, RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.quiz.request import GenerateCodebaseQuizRequest, GeneratePolicyQuizRequest, GradeAttemptRequest
from onboard.api.schema.quiz.response import QuizAttemptResponse, QuizTemplateResponse

router = APIRouter(prefix="/quizzes", tags=["quiz"])


@router.post("/codebase", response_model=QuizTemplateResponse, status_code=201)
async def generate_codebase_quiz(
    payload: GenerateCodebaseQuizRequest,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Generate a git-history-grounded readiness quiz (PRD §6.3). Admin-only."""
    return await services.quiz.generate_codebase_quiz(payload.repo_id, payload.custom_instructions)


@router.post("/policy", response_model=QuizTemplateResponse, status_code=201)
async def generate_policy_quiz(
    payload: GeneratePolicyQuizRequest,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Generate a scenario-based policy onboarding quiz (PRD §6.5). Admin-only."""
    return await services.quiz.generate_policy_quiz(payload.policy_doc_id, payload.custom_instructions)


@router.post("/attempts/{quiz_attempt_id}/grade", response_model=QuizAttemptResponse)
async def grade_attempt(
    quiz_attempt_id: str,
    payload: GradeAttemptRequest,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Grade a completed quiz attempt; members may only grade their own attempts."""
    return await services.quiz.grade_attempt(org_id, quiz_attempt_id, payload.answers, actor=actor)
