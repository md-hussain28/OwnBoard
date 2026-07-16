from fastapi import APIRouter, Depends

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.schema.archaeology.request import AskQuestionRequest
from onboard.api.schema.archaeology.response import AnswerResponse

router = APIRouter(prefix="/repos/{repo_id}/chat", tags=["archaeology"])


@router.post("/ask", response_model=AnswerResponse)
async def ask_question(
    repo_id: str, payload: AskQuestionRequest, services: ServiceContainer = Depends(get_service_container)
):
    """Grounded Q&A over a repo's git history (PRD §6.4)."""
    return await services.archaeology.answer_question(repo_id, payload.question)
