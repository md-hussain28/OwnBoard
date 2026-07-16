"""Clerk session verification for FastAPI request dependencies."""

from typing import Annotated

from clerk_backend_api import AuthenticateRequestOptions, authenticate_request
from fastapi import Depends, Request

from onboard.config.settings import get_settings
from onboard.core.common.exceptions import UnauthorizedError


def require_user(request: Request) -> str:
    """Verify the Clerk session token and return the Clerk user id (`sub`)."""
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

    user_id = state.payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token missing subject claim")
    return str(user_id)


def optional_user(request: Request) -> str | None:
    """Return the Clerk user id when a valid session is present, else None."""
    settings = get_settings()
    if not settings.CLERK_SECRET_KEY:
        return None

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    try:
        return require_user(request)
    except UnauthorizedError:
        return None


ClerkUserId = Annotated[str, Depends(require_user)]
OptionalClerkUserId = Annotated[str | None, Depends(optional_user)]
