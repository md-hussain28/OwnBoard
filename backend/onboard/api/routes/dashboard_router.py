from fastapi import APIRouter, Depends

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.dashboard.response import BusFactorHeatmapResponse, QuizAnalyticsResponse

router = APIRouter(prefix="/repos/{repo_id}/dashboard", tags=["dashboard"])


@router.get("/bus-factor-heatmap", response_model=BusFactorHeatmapResponse)
async def get_bus_factor_heatmap(
    repo_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)
):
    """Repo-wide bus-factor heatmap for the dashboard (PRD §6.8)."""
    return await services.dashboard.get_bus_factor_heatmap(org_id, repo_id)


@router.get("/quiz-analytics", response_model=QuizAnalyticsResponse)
async def get_quiz_analytics(
    repo_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)
):
    """Aggregated quiz pass rates and scores for the dashboard (PRD §6.8)."""
    return await services.dashboard.get_quiz_analytics(org_id, repo_id)
