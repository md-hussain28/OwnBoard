"""Clerk membership → employee synchronization for the employee domain.

Split out of `EmployeeService` as a mixin. Covers lazy sign-in provisioning
(`ensure_current_employee`), first-admin bootstrap, and the bulk membership sync used by list.
Relies on the DAOs and `_soft_resolve_domain_id` provided by the core service it composes into.
"""

import logging
from typing import Any

from onboard.config.constants import (
    APP_ROLE_ADMIN,
    APP_ROLE_MEMBER,
    CLERK_ORG_ADMIN_ROLES,
)
from onboard.core.clerk.client import get_clerk_client
from onboard.dao.models.employee import Employee
from onboard.services.employee.assignment import _safe_auto_assign
from onboard.services.employee.base import EmployeeServiceBase
from onboard.services.employee.mappers import (
    _app_role_from_membership,
    _invite_profile_from_meta,
    _is_clerk_role_slug,
    _member_display_name,
)

logger = logging.getLogger(__name__)


class EmployeeClerkSyncMixin(EmployeeServiceBase):
    async def ensure_current_employee(self, org_id: str, clerk_user_id: str) -> Employee:
        """Return the employee row for the signed-in user, creating it from Clerk if missing."""
        existing = await self.employee_dao.get_by_clerk_user_id(org_id, clerk_user_id)
        if existing is not None:
            return await self._maybe_bootstrap_admin(org_id, existing)

        name = clerk_user_id
        app_role = APP_ROLE_MEMBER
        clerk_role: str | None = None
        membership_meta: Any = None

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
                membership_meta = membership.public_metadata
                app_role = _app_role_from_membership(
                    public_metadata=membership_meta,
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

        profile = _invite_profile_from_meta(membership_meta)
        resolved_domain_id = await self._soft_resolve_domain_id(org_id, profile.get("domain_id"))

        created = await self.employee_dao.create(
            org_id=org_id,
            clerk_user_id=clerk_user_id,
            name=name,
            role=profile.get("role"),
            app_role=app_role,
            github_handle=profile.get("github_handle"),
            domain_id=resolved_domain_id,
        )
        # First sign-in of an invited hire: hand them their domain's published tracks immediately.
        await _safe_auto_assign(self.session, org_id, created.id)
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
                    profile = _invite_profile_from_meta(membership.public_metadata)
                    resolved_domain_id = await self._soft_resolve_domain_id(org_id, profile.get("domain_id"))

                    existing = await self.employee_dao.get_by_clerk_user_id(org_id, clerk_user_id)
                    if existing is None:
                        created = await self.employee_dao.create(
                            org_id=org_id,
                            clerk_user_id=clerk_user_id,
                            name=name,
                            role=profile.get("role"),
                            app_role=app_role,
                            github_handle=profile.get("github_handle"),
                            domain_id=resolved_domain_id,
                        )
                        await _safe_auto_assign(self.session, org_id, created.id)
                        upserted += 1
                    else:
                        patch: dict[str, Any] = {}
                        if existing.name != name:
                            patch["name"] = name
                        # Clear Clerk role slugs mistakenly stored as job titles.
                        if existing.role and _is_clerk_role_slug(existing.role):
                            patch["role"] = None
                        if patch:
                            await self.employee_dao.update(existing.id, **patch)
                            upserted += 1

                if len(memberships) < page_size:
                    break
                offset += page_size
        except Exception:
            logger.exception("Clerk organization member sync failed for org %s", org_id)
            return upserted

        return upserted
