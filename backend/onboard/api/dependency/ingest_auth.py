"""API-key authentication for the push-model ingest endpoint.

Unlike every other route, `POST /ingest` is called by a customer's GitHub Action, not a browser
with a Clerk session. It authenticates with a per-repo bearer token (`obk_…`). This dependency
verifies that token, resolves the owning org + repo from it, and records last-used — so the
endpoint derives tenancy from the key alone and never trusts a client-supplied org/repo id.
"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.api.dependency.db import get_db
from onboard.core.common.exceptions import UnauthorizedError
from onboard.core.common.ingest_token import TOKEN_PREFIX, hash_token
from onboard.dao.ingest_key_dao import IngestKeyDAO


@dataclass(frozen=True)
class IngestContext:
    """Tenancy resolved from a verified ingest key."""

    org_id: str
    repo_id: str
    key_id: str


def _extract_bearer(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedError("Missing ingest API key — send it as 'Authorization: Bearer obk_…'")
    token = token.strip()
    if not token.startswith(TOKEN_PREFIX):
        raise UnauthorizedError("Malformed ingest API key")
    return token


async def require_ingest_key(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> IngestContext:
    token = _extract_bearer(request)
    dao = IngestKeyDAO(session)
    key = await dao.get_active_by_hash(hash_token(token))
    if key is None:
        raise UnauthorizedError("Invalid or revoked ingest API key")
    await dao.touch_last_used(key.id)
    return IngestContext(org_id=key.org_id, repo_id=key.repo_id, key_id=key.id)


IngestAuth = Annotated[IngestContext, Depends(require_ingest_key)]
