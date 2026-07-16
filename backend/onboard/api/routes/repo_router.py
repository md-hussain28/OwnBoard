from fastapi import APIRouter, Depends

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.repo.request import RepoCreateRequest
from onboard.api.schema.repo.response import RepoResponse

router = APIRouter(prefix="/repos", tags=["repos"])


@router.post("", response_model=RepoResponse, status_code=201)
async def create_repo(
    payload: RepoCreateRequest, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)
):
    """Register a repo for ingestion."""
    return await services.repo_ingestion.register_repo(org_id=org_id, url=payload.url, name=payload.name)


@router.get("", response_model=list[RepoResponse])
async def list_repos(org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)):
    return await services.repo_ingestion.list_repos(org_id)


@router.get("/{repo_id}", response_model=RepoResponse)
async def get_repo(repo_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)):
    return await services.repo_ingestion.get_repo(org_id, repo_id)
