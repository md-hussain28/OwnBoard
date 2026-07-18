"""Push-model ingestion routes.

Two routers with different auth, registered separately in `main.py`:
- `ingest_router` (`POST /ingest`) — authenticated by the per-repo API key, NOT Clerk. It sits
  outside the `tenant_scoped` guard because the caller is a GitHub Action, not a browser session.
- `ingest_key_router` (`/repos/{repo_id}/ingest-keys`) — normal Clerk admin routes to mint/list/
  revoke the keys the Action uses.
"""

from fastapi import APIRouter, Depends

from onboard.api.dependency.ingest_auth import IngestAuth
from onboard.api.dependency.rbac import RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.ingest.request import IngestPayload
from onboard.api.schema.ingest.response import IngestKeyResponse, IngestSummaryResponse

ingest_router = APIRouter(tags=["ingest"])
ingest_key_router = APIRouter(prefix="/repos/{repo_id}/ingest-keys", tags=["ingest"])


@ingest_router.post("/ingest", response_model=IngestSummaryResponse)
async def ingest_metadata(
    payload: IngestPayload,
    ctx: IngestAuth,
    services: ServiceContainer = Depends(get_service_container),
):
    """Receive a git-metadata snapshot from a repo's GitHub Action (API-key authenticated).

    Org and repo are resolved from the API key — never from the payload.
    """
    return await services.ingest.ingest_metadata(ctx.org_id, ctx.repo_id, payload)


@ingest_key_router.post("", response_model=IngestKeyResponse, status_code=201)
async def create_ingest_key(
    repo_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    """Mint an ingest key for a repo. The plaintext token is returned once, here only."""
    key, token = await services.ingest.create_key(org_id, repo_id)
    return IngestKeyResponse(
        id=key.id,
        repo_id=key.repo_id,
        key_prefix=key.key_prefix,
        last_used_at=key.last_used_at,
        revoked_at=key.revoked_at,
        created_at=key.created_at,
        token=token,
    )


@ingest_key_router.get("", response_model=list[IngestKeyResponse])
async def list_ingest_keys(
    repo_id: str,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.ingest.list_keys(org_id, repo_id)


@ingest_key_router.delete("/{key_id}", response_model=IngestKeyResponse)
async def revoke_ingest_key(
    repo_id: str,
    key_id: str,
    org_id: CurrentOrgId,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
):
    return await services.ingest.revoke_key(org_id, key_id)
