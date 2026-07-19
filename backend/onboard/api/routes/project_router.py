from fastapi import APIRouter, Depends

from onboard.api.dependency.auth import ClerkUserId
from onboard.api.dependency.rbac import CurrentEmployee, RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.project.request import (
    AddProjectMembersRequest,
    AddProjectRepoRequest,
    FunctionTypeCreateRequest,
    FunctionTypeUpdateRequest,
    ModuleProgressRequest,
    ProjectCreateRequest,
    ProjectModuleCreateRequest,
    ProjectModuleUpdateRequest,
    ProjectUpdateRequest,
    RepoMembersRequest,
    TrackAssignmentRequest,
    UpdateProjectMemberRequest,
)
from onboard.api.schema.project.response import (
    MyProjectResponse,
    ProjectDetailResponse,
    ProjectFunctionTypeResponse,
    ProjectMemberResponse,
    ProjectMemberSkillsResponse,
    ProjectModuleResponse,
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
        status=payload.status,
        repo_id=payload.repo_id,
        lead_employee_id=payload.lead_employee_id,
        created_by=user_id,
        tech_stack=payload.tech_stack,
        resource_links=payload.resource_links,
        glossary=payload.glossary,
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
    """Project detail. Members see their gate; admins/leads see management fields (`can_manage`)."""
    return await services.project.get_project_detail(org_id, project_id, employee)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    payload: ProjectUpdateRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Admin or this project's team lead may update it."""
    fields = payload.model_dump(exclude_unset=True)
    clear_repo = "repo_id" in fields and fields.get("repo_id") is None
    return await services.project.update_project(
        org_id,
        project_id,
        employee,
        name=fields.get("name"),
        description=fields.get("description"),
        repo_id=fields.get("repo_id") if not clear_repo else None,
        clear_repo=clear_repo,
        status=fields.get("status"),
        is_archived=fields.get("is_archived"),
        tech_stack=fields.get("tech_stack"),
        resource_links=payload.resource_links if "resource_links" in fields else None,
        glossary=payload.glossary if "glossary" in fields else None,
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Only org admins delete projects."""
    await services.project.delete_project(org_id, project_id)


# ---- repos ----------------------------------------------------------------


@router.post("/{project_id}/repos", response_model=ProjectResponse, status_code=201)
async def add_project_repo(
    project_id: str,
    payload: AddProjectRepoRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.add_repo(
        org_id,
        project_id,
        employee,
        repo_id=payload.repo_id,
        url=payload.url,
        name=payload.name,
        is_primary=payload.is_primary,
        added_by=user_id,
    )


@router.delete("/{project_id}/repos/{repo_id}", response_model=ProjectResponse)
async def remove_project_repo(
    project_id: str,
    repo_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.remove_repo(org_id, project_id, repo_id, employee)


@router.put("/{project_id}/repos/{repo_id}/members", response_model=ProjectResponse)
async def set_repo_members(
    project_id: str,
    repo_id: str,
    payload: RepoMembersRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Set which project members are assigned to work on a linked repo."""
    return await services.project.set_repo_members(org_id, project_id, repo_id, employee, payload.employee_ids)


# ---- function types -------------------------------------------------------


@router.get("/{project_id}/function-types", response_model=list[ProjectFunctionTypeResponse])
async def list_function_types(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.list_function_types(org_id, project_id, employee)


@router.post("/{project_id}/function-types", response_model=ProjectFunctionTypeResponse, status_code=201)
async def create_function_type(
    project_id: str,
    payload: FunctionTypeCreateRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.create_function_type(
        org_id, project_id, employee, name=payload.name, sort_order=payload.sort_order
    )


@router.patch("/{project_id}/function-types/{function_type_id}", response_model=ProjectFunctionTypeResponse)
async def update_function_type(
    project_id: str,
    function_type_id: str,
    payload: FunctionTypeUpdateRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.update_function_type(
        org_id, project_id, function_type_id, employee, name=payload.name, sort_order=payload.sort_order
    )


@router.delete("/{project_id}/function-types/{function_type_id}", status_code=204)
async def delete_function_type(
    project_id: str,
    function_type_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.project.delete_function_type(org_id, project_id, function_type_id, employee)


# ---- members --------------------------------------------------------------


@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse])
async def list_project_members(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """The member panel: each member's readiness, role, function + GitHub handle, leads first."""
    return await services.project.list_project_members(org_id, project_id, employee)


@router.get("/{project_id}/skills", response_model=list[ProjectMemberSkillsResponse])
async def list_member_skills(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Per-member commit-derived skills + features (aggregated across the project's repos)."""
    return await services.project.get_member_skills(org_id, project_id, employee)


@router.post("/{project_id}/members", response_model=list[ProjectMemberResponse], status_code=201)
async def add_project_members(
    project_id: str,
    payload: AddProjectMembersRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.add_members(
        org_id,
        project_id,
        payload.employee_ids,
        added_by=user_id,
        viewer=employee,
        function_type_id=payload.function_type_id,
    )


@router.patch("/{project_id}/members/{employee_id}", response_model=list[ProjectMemberResponse])
async def update_project_member(
    project_id: str,
    employee_id: str,
    payload: UpdateProjectMemberRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Set a member's function and/or promote/demote them as this project's team lead."""
    return await services.project.update_member(
        org_id,
        project_id,
        employee_id,
        employee,
        function_type_id=payload.function_type_id,
        clear_function_type=payload.clear_function_type,
        is_lead=payload.is_lead,
    )


@router.delete("/{project_id}/members/{employee_id}", status_code=204)
async def remove_project_member(
    project_id: str,
    employee_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.project.remove_member(org_id, project_id, employee_id, employee)


# ---- tracks (gating) ------------------------------------------------------


@router.get("/{project_id}/tracks", response_model=list[ProjectTrackResponse])
async def list_project_tracks(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Project-specific tracks with the viewer's per-track progress."""
    return await services.project.list_project_tracks(org_id, project_id, employee)


@router.put("/{project_id}/tracks/{track_id}/assignment", response_model=ProjectTrackResponse)
async def update_track_assignment(
    project_id: str,
    track_id: str,
    payload: TrackAssignmentRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Set a module's combinable audience (everyone ∪ domains ∪ repo rules ∪ hand-picked members)."""
    return await services.project.update_track_assignment(
        org_id,
        project_id,
        track_id,
        employee,
        target_all_members=payload.target_all_members,
        domain_ids=payload.domain_ids,
        repo_rules=payload.repo_rules,
        manual_employee_ids=payload.manual_employee_ids,
    )


# ---- modules (dev-facing, function-targeted) ------------------------------


@router.get("/{project_id}/modules", response_model=list[ProjectModuleResponse])
async def list_project_modules(
    project_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Managers see all modules; members see the active modules assigned to them."""
    return await services.project.list_modules(org_id, project_id, employee)


@router.post("/{project_id}/modules", response_model=ProjectModuleResponse, status_code=201)
async def create_project_module(
    project_id: str,
    payload: ProjectModuleCreateRequest,
    org_id: CurrentOrgId,
    user_id: ClerkUserId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.project.create_module(
        org_id,
        project_id,
        employee,
        name=payload.name,
        description=payload.description,
        content=payload.content,
        resource_links=payload.resource_links,
        function_type_ids=payload.function_type_ids,
        sequence_order=payload.sequence_order,
        estimated_minutes=payload.estimated_minutes,
        status=payload.status,
        created_by=user_id,
    )


@router.patch("/{project_id}/modules/{module_id}", response_model=ProjectModuleResponse)
async def update_project_module(
    project_id: str,
    module_id: str,
    payload: ProjectModuleUpdateRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    fields = payload.model_dump(exclude_unset=True)
    return await services.project.update_module(
        org_id,
        project_id,
        module_id,
        employee,
        name=fields.get("name"),
        description=fields.get("description"),
        content=fields.get("content"),
        resource_links=payload.resource_links if "resource_links" in fields else None,
        function_type_ids=fields.get("function_type_ids"),
        sequence_order=fields.get("sequence_order"),
        estimated_minutes=fields.get("estimated_minutes"),
        status=fields.get("status"),
    )


@router.delete("/{project_id}/modules/{module_id}", status_code=204)
async def delete_project_module(
    project_id: str,
    module_id: str,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.project.delete_module(org_id, project_id, module_id, employee)


@router.post("/{project_id}/modules/{module_id}/progress", response_model=ProjectModuleResponse)
async def set_module_progress(
    project_id: str,
    module_id: str,
    payload: ModuleProgressRequest,
    org_id: CurrentOrgId,
    employee: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """A member updates their own progress on a module: status = in_progress | completed | assigned."""
    return await services.project.set_module_progress(org_id, project_id, module_id, employee, status=payload.status)
