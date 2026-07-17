from fastapi import APIRouter, Depends

from onboard.api.dependency.rbac import RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.org_domain.request import OrgDomainCreateRequest, OrgDomainUpdateRequest
from onboard.api.schema.org_domain.response import OrgDomainResponse

router = APIRouter(prefix="/domains", tags=["domains"])


@router.get("", response_model=list[OrgDomainResponse])
async def list_domains(
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """List org domains (seeds Developer/Marketing/… defaults on first call)."""
    return await services.org_domain.list_domains(org_id)


@router.post("", response_model=OrgDomainResponse, status_code=201)
async def create_domain(
    payload: OrgDomainCreateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Add a custom domain beyond the built-in defaults."""
    return await services.org_domain.create_domain(org_id, payload.name)


@router.patch("/{domain_id}", response_model=OrgDomainResponse)
async def update_domain(
    domain_id: str,
    payload: OrgDomainUpdateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Rename a domain (built-in or custom)."""
    return await services.org_domain.update_domain(org_id, domain_id, payload.name)


@router.delete("/{domain_id}", status_code=204)
async def delete_domain(
    domain_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Delete a custom domain (built-ins are protected). Employees keep NULL domain_id."""
    await services.org_domain.delete_domain(org_id, domain_id)
