from fastapi import APIRouter, Depends

from onboard.api.dependency.auth import ClerkUserId
from onboard.api.dependency.rbac import CurrentEmployee, RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.project.request import (
    AddProjectMembersRequest,
    ProjectCreateRequest,
    ProjectUpdateRequest,
)
from onboard.api.schema.project.response import (
    MyProjectResponse,
    ProjectDetailResponse,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectTrackResponse,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    payload: ProjectCreateRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.create_project(
        org_id=org_id,
        name=payload.name,
        description=payload.description,
        repo_id=payload.repo_id,
        created_by=user_id,
    )


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Admin: every project in the org with member + track counts."""
    return await services.project.list_projects(org_id)


@router.get("/mine", response_model=list[MyProjectResponse])
async def list_my_projects(
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Member: the projects I'm on, each with my lock/progress state."""
    return await services.project.list_my_projects(org_id, employee)


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Project detail. Members see their gate; admins see it regardless of membership."""
    return await services.project.get_project_detail(org_id, project_id, employee)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    payload: ProjectUpdateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    fields = payload.model_dump(exclude_unset=True)
    clear_repo = "repo_id" in fields and fields.get("repo_id") is None
    return await services.project.update_project(
        org_id,
        project_id,
        name=fields.get("name"),
        description=fields.get("description"),
        repo_id=fields.get("repo_id") if not clear_repo else None,
        clear_repo=clear_repo,
        status=fields.get("status"),
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.project.delete_project(org_id, project_id)


@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
async def list_project_members(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """The member panel: each member's readiness + GitHub handle, go-to people first."""
    return await services.project.list_project_members(org_id, project_id, employee)


@router.post("/{project_id}/members", response_model=list[ProjectMemberResponse], status_code=201)
async def add_project_members(
    project_id: str,
    payload: AddProjectMembersRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.add_members(org_id, project_id, payload.employee_ids, added_by=user_id)


@router.delete("/{project_id}/members/{employee_id}", status_code=204)
async def remove_project_member(
    project_id: str,
    employee_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.project.remove_member(org_id, project_id, employee_id)


@router.get("/{project_id}/tracks", response_model=list[ProjectTrackResponse])
async def list_project_tracks(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Project-specific tracks with the viewer's per-track progress."""
    return await services.project.list_project_tracks(org_id, project_id, employee)
