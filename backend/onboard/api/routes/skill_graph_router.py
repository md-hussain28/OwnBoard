from fastapi import APIRouter, Depends

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.skill_graph.response import BusFactorResponse, ExpertiseScoreResponse

router = APIRouter(prefix="/repos/{repo_id}/skill-graph", tags=["skill-graph"])


@router.get("/expertise", response_model=list[ExpertiseScoreResponse])
async def get_expertise_scores(
    repo_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)
):
    """Per-file expertise scores derived from git history (PRD §6.2)."""
    return await services.skill_graph.compute_expertise_scores(org_id, repo_id)


@router.get("/bus-factor", response_model=list[BusFactorResponse])
async def get_bus_factor(
    repo_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)
):
    """Bus-factor risk per file derived from the expertise scores (PRD §6.2)."""
    return await services.skill_graph.compute_bus_factor(org_id, repo_id)
