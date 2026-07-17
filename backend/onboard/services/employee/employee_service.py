import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import (
    APP_ROLE_ADMIN,
    APP_ROLE_MEMBER,
    APP_ROLES,
    CLERK_ORG_ADMIN_ROLES,
)
from onboard.config.settings import get_settings
from onboard.core.clerk.client import get_clerk_client
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.employee import Employee

logger = logging.getLogger(__name__)


def _member_display_name(
    first_name: str | None,
    last_name: str | None,
    identifier: str | None,
    username: str | None,
    user_id: str,
) -> str:
    full = " ".join(part for part in (first_name, last_name) if part).strip()
    if full:
        return full
    if identifier:
        return identifier
    if username:
        return username
    return user_id


def _normalize_app_role(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized in APP_ROLES:
        return normalized
    return None


def _app_role_from_membership(*, public_metadata: Any, clerk_role: str | None) -> str:
    """Resolve OwnBoard app_role on first create only.

    Preference: invitation/membership public_metadata.app_role → Clerk org:admin bootstrap → member.
    """
    meta: dict[str, Any] = {}
    if isinstance(public_metadata, dict):
        meta = public_metadata
    from_meta = _normalize_app_role(meta.get("app_role") if meta else None)
    if from_meta:
        return from_meta
    if clerk_role and clerk_role in CLERK_ORG_ADMIN_ROLES:
        return APP_ROLE_ADMIN
    return APP_ROLE_MEMBER


class EmployeeService:
    """Employee registration CRUD, scoped to the caller's active organization (PRD §3).

    List also lazily syncs Clerk organization memberships into `employee` rows so
    Assign UIs see org members without a separate webhook receiver.
    OwnBoard `app_role` is the RBAC source of truth — never overwritten by Clerk sync.
    """

    def __init__(self, session: AsyncSession):
        self.employee_dao = EmployeeDAO(session)

    async def create_employee(
        self,
        org_id: str,
        name: str,
        role: str | None,
        github_handle: str | None,
        *,
        app_role: str = APP_ROLE_MEMBER,
        clerk_user_id: str | None = None,
    ) -> Employee:
        normalized = _normalize_app_role(app_role) or APP_ROLE_MEMBER
        return await self.employee_dao.create(
            org_id=org_id,
            name=name,
            role=role,
            github_handle=github_handle,
            app_role=normalized,
            clerk_user_id=clerk_user_id,
        )

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
            fields["role"] = role or None
        if name is not None:
            if not name.strip():
                raise ValidationError("name cannot be empty")
            fields["name"] = name.strip()
        if github_handle is not None:
            fields["github_handle"] = github_handle or None

        if not fields:
            return employee

        updated = await self.employee_dao.update(employee.id, **fields)
        if updated is None:
            raise NotFoundError(f"Employee {employee_id} not found")
        return updated

    async def invite_member(
        self,
        org_id: str,
        *,
        email: str,
        app_role: str = APP_ROLE_MEMBER,
        inviter_user_id: str | None = None,
    ) -> dict[str, Any]:
        normalized = _normalize_app_role(app_role)
        if normalized is None:
            raise ValidationError(f"app_role must be one of: {', '.join(sorted(APP_ROLES))}")

        email_clean = email.strip().lower()
        if not email_clean or "@" not in email_clean:
            raise ValidationError("A valid email address is required")

        try:
            clerk = get_clerk_client()
        except RuntimeError as exc:
            raise ValidationError(str(exc)) from exc

        settings = get_settings()
        redirect_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/sign-in"

        try:
            kwargs: dict[str, Any] = {
                "organization_id": org_id,
                "email_address": email_clean,
                "role": "org:member",
                "public_metadata": {"app_role": normalized},
                "redirect_url": redirect_url,
            }
            # Backend secret can invite without a Clerk org:admin inviter; pass when available.
            if inviter_user_id:
                kwargs["inviter_user_id"] = inviter_user_id
            invitation = await clerk.organization_invitations.create_async(**kwargs)
        except Exception as exc:
            logger.exception("Clerk organization invitation failed for org %s", org_id)
            raise ValidationError(f"Failed to send invitation: {exc}") from exc

        return {
            "id": invitation.id,
            "email_address": email_clean,
            "app_role": normalized,
            "status": getattr(invitation, "status", None) or "pending",
        }

    async def ensure_current_employee(self, org_id: str, clerk_user_id: str) -> Employee:
        """Return the employee row for the signed-in user, creating it from Clerk if missing."""
        existing = await self.employee_dao.get_by_clerk_user_id(org_id, clerk_user_id)
        if existing is not None:
            return await self._maybe_bootstrap_admin(org_id, existing)

        name = clerk_user_id
        app_role = APP_ROLE_MEMBER
        clerk_role: str | None = None

        try:
            clerk = get_clerk_client()
            user = await clerk.users.get_async(user_id=clerk_user_id)
            primary_email = None
            if user.email_addresses:
                for addr in user.email_addresses:
                    if user.primary_email_address_id and addr.id == user.primary_email_address_id:
                        primary_email = addr.email_address
                        break
                if primary_email is None and user.email_addresses:
                    primary_email = user.email_addresses[0].email_address
            name = _member_display_name(
                user.first_name,
                user.last_name,
                primary_email,
                user.username,
                clerk_user_id,
            )

            page = await clerk.organization_memberships.list_async(
                organization_id=org_id,
                user_id=[clerk_user_id],
                limit=1,
            )
            memberships = page.data or []
            if memberships:
                membership = memberships[0]
                clerk_role = membership.role
                app_role = _app_role_from_membership(
                    public_metadata=membership.public_metadata,
                    clerk_role=clerk_role,
                )
        except Exception:
            logger.exception(
                "Failed to resolve Clerk profile for ensure_current_employee org=%s user=%s",
                org_id,
                clerk_user_id,
            )

        # Race-safe: another request may have created the row while we talked to Clerk.
        existing = await self.employee_dao.get_by_clerk_user_id(org_id, clerk_user_id)
        if existing is not None:
            return await self._maybe_bootstrap_admin(org_id, existing)

        created = await self.employee_dao.create(
            org_id=org_id,
            clerk_user_id=clerk_user_id,
            name=name,
            role=None,
            app_role=app_role,
            github_handle=None,
        )
        return await self._maybe_bootstrap_admin(org_id, created)

    async def _maybe_bootstrap_admin(self, org_id: str, employee: Employee) -> Employee:
        """If the org has no admins yet and this user is a Clerk org:admin, promote them once."""
        if employee.app_role == APP_ROLE_ADMIN:
            return employee
        admin_count = await self.employee_dao.count_admins(org_id)
        if admin_count > 0:
            return employee

        if not employee.clerk_user_id:
            return employee

        try:
            clerk = get_clerk_client()
            page = await clerk.organization_memberships.list_async(
                organization_id=org_id,
                user_id=[employee.clerk_user_id],
                limit=1,
            )
            memberships = page.data or []
            if not memberships or memberships[0].role not in CLERK_ORG_ADMIN_ROLES:
                return employee
        except Exception:
            logger.exception("Admin bootstrap Clerk lookup failed for org %s", org_id)
            return employee

        updated = await self.employee_dao.update(employee.id, app_role=APP_ROLE_ADMIN)
        return updated or employee

    async def sync_org_members_from_clerk(self, org_id: str) -> int:
        """Upsert Clerk organization members as employees. Returns upserted count.

        Soft-fails (logs + returns 0) if Clerk is unreachable so list still works
        for manually created employees. Never overwrites existing `app_role`.
        """
        try:
            clerk = get_clerk_client()
        except RuntimeError as exc:
            logger.warning("Skipping Clerk member sync: %s", exc)
            return 0

        upserted = 0
        offset = 0
        page_size = 100

        try:
            while True:
                page = await clerk.organization_memberships.list_async(
                    organization_id=org_id,
                    limit=page_size,
                    offset=offset,
                )
                memberships = page.data or []
                if not memberships:
                    break

                for membership in memberships:
                    public_user = membership.public_user_data
                    if public_user is None or not public_user.user_id:
                        continue

                    clerk_user_id = public_user.user_id
                    name = _member_display_name(
                        public_user.first_name,
                        public_user.last_name,
                        public_user.identifier,
                        public_user.username,
                        clerk_user_id,
                    )
                    app_role = _app_role_from_membership(
                        public_metadata=membership.public_metadata,
                        clerk_role=membership.role,
                    )

                    existing = await self.employee_dao.get_by_clerk_user_id(org_id, clerk_user_id)
                    if existing is None:
                        await self.employee_dao.create(
                            org_id=org_id,
                            clerk_user_id=clerk_user_id,
                            name=name,
                            role=None,
                            app_role=app_role,
                            github_handle=None,
                        )
                        upserted += 1
                    elif existing.name != name:
                        await self.employee_dao.update(existing.id, name=name)
                        upserted += 1

                if len(memberships) < page_size:
                    break
                offset += page_size
        except Exception:
            logger.exception("Clerk organization member sync failed for org %s", org_id)
            return upserted

        return upserted


def require_employee_app_role(employee: Employee, *allowed: str) -> Employee:
    """Raise ForbiddenError unless employee.app_role is in allowed."""
    if employee.app_role not in allowed:
        raise ForbiddenError("Admin access required")
    return employee
