from fastapi import APIRouter, Depends

from onboard.api.dependency.rbac import CurrentEmployee, RequireAdmin, assert_self_or_admin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.employee.request import EmployeeCreateRequest, EmployeeInviteRequest, EmployeeUpdateRequest
from onboard.api.schema.employee.response import EmployeeInvitationResponse, EmployeeResponse
from onboard.dao.models.employee import Employee

router = APIRouter(prefix="/employees", tags=["employees"])


def _employee_response(employee: Employee) -> EmployeeResponse:
    return EmployeeResponse(
        id=employee.id,
        org_id=employee.org_id,
        clerk_user_id=employee.clerk_user_id,
        name=employee.name,
        role=employee.role,
        app_role=employee.app_role,
        github_handle=employee.github_handle,
        domain_id=employee.domain_id,
        domain_name=employee.domain.name if employee.domain else None,
        created_at=employee.created_at,
        updated_at=employee.updated_at,
    )


@router.post("", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    payload: EmployeeCreateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    employee = await services.employee.create_employee(
        org_id=org_id,
        name=payload.name,
        role=payload.role,
        github_handle=payload.github_handle,
        app_role=payload.app_role,
        domain_id=payload.domain_id,
    )
    return _employee_response(await services.employee.get_employee(org_id, employee.id))


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Admin-only roster — used for assignment pickers and team management."""
    employees = await services.employee.list_employees(org_id)
    return [_employee_response(employee) for employee in employees]


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
    employee_id: str,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    assert_self_or_admin(actor=actor, target_employee_id=employee_id)
    return _employee_response(await services.employee.get_employee(org_id, employee_id))


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    payload: EmployeeUpdateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    fields = payload.model_dump(exclude_unset=True)
    clear_domain = "domain_id" in fields and fields.get("domain_id") is None
    domain_id = fields.get("domain_id") if not clear_domain else None
    employee = await services.employee.update_employee(
        org_id,
        employee_id,
        name=fields.get("name"),
        role=fields.get("role"),
        github_handle=fields.get("github_handle"),
        app_role=fields.get("app_role"),
        domain_id=domain_id,
        clear_domain=clear_domain,
    )
    return _employee_response(employee)
