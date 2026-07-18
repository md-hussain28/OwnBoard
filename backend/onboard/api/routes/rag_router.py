from fastapi import APIRouter, Depends

from onboard.api.dependency.rbac import RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.rag.request import RetrieveRequest
from onboard.api.schema.rag.response import RetrieveResponse

router = APIRouter(prefix="/repos/{repo_id}/rag", tags=["rag"])


@router.post("/chunk-and-embed", status_code=202)
async def chunk_and_embed(
    repo_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Manually embed this repo's pending code chunks (bounded). Admin-only (PRD §6.1).

    The primary embedding path is the off-dyno cron job; this is a convenience trigger. Returns how
    many chunks were embedded this pass and how many remain, so the UI can re-poke until drained.
    """
    embedded = await services.rag.embed_pending_chunks(repo_id=repo_id)
    remaining = await services.rag.code_chunk_dao.count_pending(repo_id=repo_id)
    return {"embedded": embedded, "remaining": remaining}


@router.post("/retrieve", response_model=RetrieveResponse)
async def retrieve(
    repo_id: str,
    payload: RetrieveRequest,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
):
    """Semantic retrieval over embedded code chunks (PRD §6.3)."""
    chunks = await services.rag.retrieve_code(org_id, repo_id, payload.query, top_k=payload.top_k)
    return RetrieveResponse(chunks=chunks)
