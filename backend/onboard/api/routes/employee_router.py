from fastapi import APIRouter, Depends

from onboard.api.dependency.rbac import RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.employee.request import EmployeeCreateRequest, EmployeeInviteRequest, EmployeeUpdateRequest
from onboard.api.schema.employee.response import EmployeeInvitationResponse, EmployeeResponse

router = APIRouter(prefix="/employees", tags=["employees"])


@router.post("", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    payload: EmployeeCreateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.employee.create_employee(
        org_id=org_id,
        name=payload.name,
        role=payload.role,
        github_handle=payload.github_handle,
        app_role=payload.app_role,
    )


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)):
    return await services.employee.list_employees(org_id)


@router.post("/invitations", response_model=EmployeeInvitationResponse, status_code=201)
async def invite_employee(
    payload: EmployeeInviteRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    # Omit Clerk inviter_user_id — Backend API can invite without requiring Clerk org:admin.
    return await services.employee.invite_member(
        org_id,
        email=payload.email,
        app_role=payload.app_role,
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)
):
    return await services.employee.get_employee(org_id, employee_id)


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    payload: EmployeeUpdateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.employee.update_employee(
        org_id,
        employee_id,
        name=payload.name,
        role=payload.role,
        github_handle=payload.github_handle,
        app_role=payload.app_role,
    )
