"""Clerk organization invitation flows for the employee domain (invite / list pending / revoke).

Split out of `EmployeeService` as a mixin; it relies on the DAOs and `_resolve_domain_id` /
`_soft_resolve_domain_id` provided by the core service it is composed into.
"""

import logging
from datetime import UTC, datetime
from typing import Any

from onboard.config.constants import APP_ROLE_MEMBER, APP_ROLES
from onboard.config.settings import get_settings
from onboard.core.clerk.client import get_clerk_client
from onboard.core.common.exceptions import NotFoundError, ValidationError
from onboard.services.employee.base import EmployeeServiceBase
from onboard.services.employee.mappers import (
    _invite_profile_from_meta,
    _meta_dict,
    _normalize_app_role,
    _normalize_github_handle,
    _normalize_job_title,
)

logger = logging.getLogger(__name__)


class EmployeeInvitationMixin(EmployeeServiceBase):
    async def invite_member(
        self,
        org_id: str,
        *,
        email: str,
        app_role: str = APP_ROLE_MEMBER,
        role: str | None = None,
        github_handle: str | None = None,
        domain_id: str | None = None,
        inviter_user_id: str | None = None,
    ) -> dict[str, Any]:
        normalized = _normalize_app_role(app_role)
        if normalized is None:
            raise ValidationError(f"app_role must be one of: {', '.join(sorted(APP_ROLES))}")

        email_clean = email.strip().lower()
        if not email_clean or "@" not in email_clean:
            raise ValidationError("A valid email address is required")

        job_title = _normalize_job_title(role)
        github = _normalize_github_handle(github_handle)
        resolved_domain_id = await self._resolve_domain_id(org_id, domain_id)

        try:
            clerk = get_clerk_client()
        except RuntimeError as exc:
            raise ValidationError(str(exc)) from exc

        settings = get_settings()
        redirect_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/sign-in"

        public_metadata: dict[str, Any] = {"app_role": normalized}
        if job_title is not None:
            public_metadata["job_title"] = job_title
        if github is not None:
            public_metadata["github_handle"] = github
        if resolved_domain_id is not None:
            public_metadata["domain_id"] = resolved_domain_id

        try:
            kwargs: dict[str, Any] = {
                "organization_id": org_id,
                "email_address": email_clean,
                "role": "org:member",
                "public_metadata": public_metadata,
                "redirect_url": redirect_url,
            }
            # Backend secret can invite without a Clerk org:admin inviter; pass when available.
            if inviter_user_id:
                kwargs["inviter_user_id"] = inviter_user_id
            invitation = await clerk.organization_invitations.create_async(**kwargs)
        except Exception as exc:
            logger.exception("Clerk organization invitation failed for org %s", org_id)
            raise ValidationError(f"Failed to send invitation: {exc}") from exc

        return await self._invitation_dict(org_id, invitation)

    async def list_pending_invitations(self, org_id: str) -> list[dict[str, Any]]:
        """List Clerk org invitations that have not been accepted yet."""
        try:
            clerk = get_clerk_client()
        except RuntimeError as exc:
            raise ValidationError(str(exc)) from exc

        invitations: list[Any] = []
        offset = 0
        page_size = 100
        try:
            while True:
                page = await clerk.organization_invitations.list_pending_async(
                    organization_id=org_id,
                    limit=page_size,
                    offset=offset,
                )
                batch = page.data or []
                if not batch:
                    break
                invitations.extend(batch)
                if len(batch) < page_size:
                    break
                offset += page_size
        except Exception as exc:
            logger.exception("Clerk list pending invitations failed for org %s", org_id)
            raise ValidationError(f"Failed to load invitations: {exc}") from exc

        return [await self._invitation_dict(org_id, invitation) for invitation in invitations]

    async def revoke_invitation(self, org_id: str, invitation_id: str) -> dict[str, Any]:
        """Cancel a pending Clerk organization invitation."""
        invitation_id = invitation_id.strip()
        if not invitation_id:
            raise ValidationError("invitation_id is required")

        try:
            clerk = get_clerk_client()
        except RuntimeError as exc:
            raise ValidationError(str(exc)) from exc

        try:
            # Backend secret can revoke without a Clerk org:admin requester.
            invitation = await clerk.organization_invitations.revoke_async(
                organization_id=org_id,
                invitation_id=invitation_id,
            )
        except Exception as exc:
            logger.exception(
                "Clerk revoke invitation failed for org %s invitation %s",
                org_id,
                invitation_id,
            )
            message = str(exc).lower()
            if "not found" in message or "404" in message:
                raise NotFoundError(f"Invitation {invitation_id} not found") from exc
            raise ValidationError(f"Failed to revoke invitation: {exc}") from exc

        return await self._invitation_dict(org_id, invitation)

    async def _invitation_dict(self, org_id: str, invitation: Any) -> dict[str, Any]:
        meta = _meta_dict(getattr(invitation, "public_metadata", None))
        app_role = _normalize_app_role(meta.get("app_role")) or APP_ROLE_MEMBER
        profile = _invite_profile_from_meta(meta)
        domain_id = await self._soft_resolve_domain_id(org_id, profile.get("domain_id"))
        domain_name: str | None = None
        if domain_id:
            domain = await self.domain_dao.get_by_id_for_org(org_id, domain_id)
            domain_name = domain.name if domain is not None else None

        created_at: datetime | None = None
        created_ms = getattr(invitation, "created_at", None)
        if isinstance(created_ms, int):
            created_at = datetime.fromtimestamp(created_ms / 1000, tz=UTC)

        return {
            "id": invitation.id,
            "email_address": getattr(invitation, "email_address", "") or "",
            "app_role": app_role,
            "status": getattr(invitation, "status", None) or "pending",
            "role": profile.get("role"),
            "github_handle": profile.get("github_handle"),
            "domain_id": domain_id,
            "domain_name": domain_name,
            "created_at": created_at,
        }
