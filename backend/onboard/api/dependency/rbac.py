"""Resolves the signed-in org member to a persisted Employee and enforces OwnBoard app_role."""

from typing import Annotated, Literal

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.api.dependency.auth import AuthContext, _verify_session
from onboard.api.dependency.db import get_db
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError
from onboard.dao.models.employee import Employee
from onboard.services.employee.employee_service import EmployeeService, require_employee_app_role


async def get_current_employee(
    org_id: CurrentOrgId,
    context: Annotated[AuthContext, Depends(_verify_session)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Employee:
    """Load (or create) the Employee row for the active Clerk user + org."""
    return await EmployeeService(session).ensure_current_employee(org_id, context.user_id)


CurrentEmployee = Annotated[Employee, Depends(get_current_employee)]


def require_app_role(*roles: str):
    """FastAPI dependency factory — require the caller's employee.app_role to be one of `roles`."""

    async def _dep(employee: CurrentEmployee) -> Employee:
        return require_employee_app_role(employee, *roles)

    return _dep


RequireAdmin = Annotated[Employee, Depends(require_app_role(APP_ROLE_ADMIN))]

AppRoleName = Literal["admin", "member"]


def assert_self_or_admin(
    *,
    actor: Employee,
    target_employee_id: str,
    message: str = "You can only access your own records",
) -> None:
    """Allow admins for any target; members only when target_employee_id is themselves."""
    if actor.app_role == APP_ROLE_ADMIN:
        return
    if actor.id == target_employee_id:
        return
    raise ForbiddenError(message)


def is_admin(employee: Employee) -> bool:
    return employee.app_role == APP_ROLE_ADMIN
