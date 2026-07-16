from fastapi import APIRouter

from onboard.api.dependency.auth import ClerkUserId

router = APIRouter(prefix="/me", tags=["auth"])


@router.get("")
async def me(user_id: ClerkUserId) -> dict[str, str]:
    """Return the authenticated Clerk user id. Used to verify frontend→backend token forwarding."""
    return {"user_id": user_id}
