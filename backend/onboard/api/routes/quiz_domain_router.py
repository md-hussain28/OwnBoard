from fastapi import APIRouter, Depends

from onboard.api.dependency.rbac import RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.quiz_domain.request import QuizDomainCreateRequest
from onboard.api.schema.quiz_domain.response import QuizDomainResponse

router = APIRouter(prefix="/quiz-domains", tags=["quiz-domains"])


@router.get("", response_model=list[QuizDomainResponse])
async def list_quiz_domains(
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """List quiz domains (seeds Policy/Security/… defaults on first call)."""
    return await services.quiz_domain.list_domains(org_id)


@router.post("", response_model=QuizDomainResponse, status_code=201)
async def create_quiz_domain(
    payload: QuizDomainCreateRequest,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Add a custom quiz domain beyond the built-in defaults."""
    return await services.quiz_domain.create_domain(org_id, payload.name)


@router.delete("/{domain_id}", status_code=204)
async def delete_quiz_domain(
    domain_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Delete a custom quiz domain (built-ins are protected). Packs keep NULL domain_id."""
    await services.quiz_domain.delete_domain(org_id, domain_id)
