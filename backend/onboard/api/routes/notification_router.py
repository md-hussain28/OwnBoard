from fastapi import APIRouter, Depends

from onboard.api.dependency.rbac import CurrentEmployee
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.notification.response import NotificationResponse, UnreadCountResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """The signed-in user's in-app notifications, newest first (Track PRD §notifications).

    Overdue and admin-digest notifications are lazily materialized on this read, so no scheduler is needed.
    """
    return await services.notification.list_for_employee(org_id, actor)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    """Bell badge count — cheap enough for the 45s poll the frontend runs."""
    return UnreadCountResponse(unread=await services.notification.unread_count(org_id, actor))


@router.post("/{notification_id}/read", status_code=204)
async def mark_read(
    notification_id: str,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.notification.mark_read(org_id, actor, notification_id)


@router.post("/read-all", status_code=204)
async def mark_all_read(
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    services: ServiceContainer = Depends(get_service_container),
):
    await services.notification.mark_all_read(org_id, actor)
