from fastapi import APIRouter, Depends

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.schema.expert_routing.response import ExpertRoutingResponse

router = APIRouter(prefix="/repos/{repo_id}/experts", tags=["expert-routing"])


@router.get("", response_model=ExpertRoutingResponse)
async def route_to_expert(repo_id: str, file_path: str, services: ServiceContainer = Depends(get_service_container)):
    """Route a new hire to the best expert for a given file (PRD §6.6)."""
    return await services.expert_routing.route_to_expert(repo_id, file_path)
