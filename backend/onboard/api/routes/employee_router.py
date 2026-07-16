from fastapi import APIRouter, Depends

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.employee.request import EmployeeCreateRequest
from onboard.api.schema.employee.response import EmployeeResponse

router = APIRouter(prefix="/employees", tags=["employees"])


@router.post("", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    payload: EmployeeCreateRequest,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.employee.create_employee(
        org_id=org_id, name=payload.name, role=payload.role, github_handle=payload.github_handle
    )


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)):
    return await services.employee.list_employees(org_id)


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: str, org_id: CurrentOrgId, services: ServiceContainer = Depends(get_service_container)
):
    return await services.employee.get_employee(org_id, employee_id)
