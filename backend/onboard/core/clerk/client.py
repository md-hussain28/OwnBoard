from functools import lru_cache

from clerk_backend_api import Clerk

from onboard.config.settings import get_settings


@lru_cache
def get_clerk_client() -> Clerk:
    settings = get_settings()
    if not settings.CLERK_SECRET_KEY:
        raise RuntimeError("CLERK_SECRET_KEY is required to sync organization members")
    return Clerk(bearer_auth=settings.CLERK_SECRET_KEY)
