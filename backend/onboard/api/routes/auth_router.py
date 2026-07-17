from fastapi import APIRouter, Depends
from pydantic import BaseModel

from onboard.api.dependency.auth import AuthContext, _verify_session
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.dao.organization_dao import OrganizationDAO

router = APIRouter(prefix="/me", tags=["auth"])


class MeResponse(BaseModel):
    user_id: str
    org_id: str | None = None
    employee_id: str | None = None
    app_role: str | None = None


@router.get("", response_model=MeResponse)
async def me(
    context: AuthContext = Depends(_verify_session),
    services: ServiceContainer = Depends(get_service_container),
) -> MeResponse:
    """Return the authenticated user, and when an org is active, their OwnBoard employee + app_role."""
    if not context.org_id:
        return MeResponse(user_id=context.user_id)

    await OrganizationDAO(services.session).get_or_create(context.org_id)
    employee = await services.employee.ensure_current_employee(context.org_id, context.user_id)
    return MeResponse(
        user_id=context.user_id,
        org_id=context.org_id,
        employee_id=employee.id,
        app_role=employee.app_role,
    )
