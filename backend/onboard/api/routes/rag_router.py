from fastapi import APIRouter, Depends

from onboard.api.dependency.rbac import RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.schema.rag.request import RetrieveRequest
from onboard.api.schema.rag.response import RetrieveResponse

router = APIRouter(prefix="/repos/{repo_id}/rag", tags=["rag"])


@router.post("/chunk-and-embed", status_code=202)
async def chunk_and_embed(
    repo_id: str,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Kick off chunking + embedding of a repo's code (PRD §6.1). Admin-only."""
    return await services.rag.chunk_and_embed(repo_id)


@router.post("/retrieve", response_model=RetrieveResponse)
async def retrieve(
    repo_id: str,
    payload: RetrieveRequest,
    services: ServiceContainer = Depends(get_service_container),
):
    """Semantic retrieval over embedded code chunks (PRD §6.3)."""
    return await services.rag.retrieve(repo_id, payload.query)
