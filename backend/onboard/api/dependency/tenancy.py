"""Resolves the active Clerk organization to a persisted `Organization` row for use in services/DAOs."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.api.dependency.auth import ClerkOrgId
from onboard.api.dependency.db import get_db
from onboard.dao.organization_dao import OrganizationDAO


async def get_current_org_id(org_id: ClerkOrgId, session: Annotated[AsyncSession, Depends(get_db)]) -> str:
    """Return the active org id, auto-provisioning its `Organization` row on first sight.

    There's no Clerk organization webhook receiver yet, so this lazy get-or-create is the org's system-of-record
    entry point on the backend — the row always exists before any tenant-owned FK (employee.org_id, repo.org_id,
    ...) is written against it.
    """
    await OrganizationDAO(session).get_or_create(org_id)
    return org_id


CurrentOrgId = Annotated[str, Depends(get_current_org_id)]
