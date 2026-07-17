from typing import Any

from onboard.config.constants import (
    APP_ROLE_ADMIN,
    APP_ROLE_MEMBER,
    APP_ROLES,
)
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.dao.models.employee import Employee
from onboard.services.employee.assignment import _safe_auto_assign
from onboard.services.employee.base import EmployeeServiceBase
from onboard.services.employee.clerk_sync import EmployeeClerkSyncMixin
from onboard.services.employee.invitations import EmployeeInvitationMixin
from onboard.services.employee.mappers import (
    _normalize_app_role,
    _normalize_github_handle,
    _normalize_job_title,
)


class EmployeeService(EmployeeInvitationMixin, EmployeeClerkSyncMixin, EmployeeServiceBase):
    """Employee registration CRUD, scoped to the caller's active organization (PRD §3).

    List also lazily syncs Clerk organization memberships into `employee` rows so
    Assign UIs see org members without a separate webhook receiver.
    OwnBoard `app_role` is the RBAC source of truth — never overwritten by Clerk sync.

    Clerk-invitation flows and Clerk-membership sync live in the composed mixins
    (`EmployeeInvitationMixin`, `EmployeeClerkSyncMixin`); DAO wiring and domain resolvers live
    in `EmployeeServiceBase`. This class owns the core CRUD.
    """

    async def create_employee(
        self,
        org_id: str,
        name: str,
        role: str | None,
        github_handle: str | None,
        *,
        app_role: str = APP_ROLE_MEMBER,
        clerk_user_id: str | None = None,
        domain_id: str | None = None,
    ) -> Employee:
        normalized = _normalize_app_role(app_role) or APP_ROLE_MEMBER
        resolved_domain_id = await self._resolve_domain_id(org_id, domain_id)
        employee = await self.employee_dao.create(
            org_id=org_id,
            name=name,
            role=_normalize_job_title(role),
            github_handle=_normalize_github_handle(github_handle),
            app_role=normalized,
            clerk_user_id=clerk_user_id,
            domain_id=resolved_domain_id,
        )
        await _safe_auto_assign(self.session, org_id, employee.id)
        return employee

    async def get_employee(self, org_id: str, employee_id: str) -> Employee:
        employee = await self.employee_dao.get_by_id_for_org(org_id, employee_id)
        if employee is None:
            raise NotFoundError(f"Employee {employee_id} not found")
        return employee

    async def list_employees(self, org_id: str, limit: int = 100, offset: int = 0) -> list[Employee]:
        await self.sync_org_members_from_clerk(org_id)
        return await self.employee_dao.list_for_org(org_id, limit=limit, offset=offset)

    async def update_employee(
        self,
        org_id: str,
        employee_id: str,
        *,
        app_role: str | None = None,
        role: str | None = None,
        name: str | None = None,
        github_handle: str | None = None,
        domain_id: str | None = None,
        clear_domain: bool = False,
    ) -> Employee:
        employee = await self.get_employee(org_id, employee_id)
        fields: dict[str, Any] = {}

        if app_role is not None:
            normalized = _normalize_app_role(app_role)
            if normalized is None:
                raise ValidationError(f"app_role must be one of: {', '.join(sorted(APP_ROLES))}")
            if employee.app_role == APP_ROLE_ADMIN and normalized != APP_ROLE_ADMIN:
                admin_count = await self.employee_dao.count_admins(org_id)
                if admin_count <= 1:
                    raise ValidationError("Cannot demote the last admin in the organization")
            fields["app_role"] = normalized

        if role is not None:
            fields["role"] = _normalize_job_title(role)
        if name is not None:
            if not name.strip():
                raise ValidationError("name cannot be empty")
            fields["name"] = name.strip()
        if github_handle is not None:
            fields["github_handle"] = _normalize_github_handle(github_handle)
        if clear_domain:
            fields["domain_id"] = None
        elif domain_id is not None:
            fields["domain_id"] = await self._resolve_domain_id(org_id, domain_id)

        if not fields:
            return employee

        domain_changed = "domain_id" in fields and fields["domain_id"] != employee.domain_id
        updated = await self.employee_dao.update(employee.id, **fields)
        if updated is None:
            raise NotFoundError(f"Employee {employee_id} not found")
        # A hire moving into a domain should pick up that domain's published tracks.
        if domain_changed:
            await _safe_auto_assign(self.session, org_id, updated.id)
        # Reload with domain relationship for response hydration.
        return await self.get_employee(org_id, updated.id)


def require_employee_app_role(employee: Employee, *allowed: str) -> Employee:
    """Raise ForbiddenError unless employee.app_role is in allowed."""
    if employee.app_role not in allowed:
        raise ForbiddenError("Admin access required")
    return employee
