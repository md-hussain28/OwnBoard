"""Clerk session verification for FastAPI request dependencies."""

from dataclasses import dataclass
from typing import Annotated

from clerk_backend_api import AuthenticateRequestOptions, authenticate_request
from fastapi import Depends, Request

from onboard.config.settings import get_settings
from onboard.core.common.exceptions import ForbiddenError, UnauthorizedError


@dataclass(frozen=True)
class AuthContext:
    """Identity verified from the Clerk session token: who signed in, and which organization (if any) is active."""

    user_id: str
    org_id: str | None
    org_role: str | None


def _verify_session(request: Request) -> AuthContext:
    settings = get_settings()
    if not settings.CLERK_SECRET_KEY:
        raise UnauthorizedError("Clerk is not configured on the backend")

    state = authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=settings.CLERK_SECRET_KEY,
            jwt_key=settings.CLERK_JWT_KEY or None,
            authorized_parties=settings.clerk_authorized_parties,
            accepts_token=["session_token"],
        ),
    )
    if not state.is_signed_in or not state.payload:
        reason = state.reason.name if state.reason else "unauthorized"
        raise UnauthorizedError(reason)

    payload = state.payload
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token missing subject claim")

    # Recent Clerk session tokens nest org claims under a compact "o" object ({id, rol, slg}) to save space;
    # older tokens/customized claim templates may still use the flat org_id/org_role keys. Accept either.
    compact_org = payload.get("o") or {}
    org_id = payload.get("org_id") or compact_org.get("id")
    org_role = payload.get("org_role") or compact_org.get("rol")

    return AuthContext(user_id=str(user_id), org_id=str(org_id) if org_id else None, org_role=org_role)


def require_user(context: Annotated[AuthContext, Depends(_verify_session)]) -> str:
    """Return the authenticated Clerk user id, regardless of organization state."""
    return context.user_id


def require_org(context: Annotated[AuthContext, Depends(_verify_session)]) -> str:
    """Return the active Clerk organization id from the verified session token.

    Every tenant-owned read/write must derive `org_id` from this (or `CurrentOrgId` in
    `api/dependency/tenancy.py`), never from a client-supplied field — that's what keeps a manager in one
    organization from ever touching another organization's data.
    """
    if not context.org_id:
        raise ForbiddenError("No active organization — select or switch into an organization first")
    return context.org_id


def optional_user(request: Request) -> str | None:
    """Return the Clerk user id when a valid session is present, else None."""
    settings = get_settings()
    if not settings.CLERK_SECRET_KEY:
        return None

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    try:
        return _verify_session(request).user_id
    except UnauthorizedError:
        return None


ClerkUserId = Annotated[str, Depends(require_user)]
ClerkOrgId = Annotated[str, Depends(require_org)]
OptionalClerkUserId = Annotated[str | None, Depends(optional_user)]
