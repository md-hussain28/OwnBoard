import uuid

import pytest

from onboard.dao.organization_dao import OrganizationDAO
from onboard.services.repo_ingestion.repo_ingestion_service import RepoIngestionService


@pytest.mark.asyncio
async def test_register_and_fetch_repo(db_session):
    org_id = f"org_test_{uuid.uuid4().hex[:8]}"
    await OrganizationDAO(db_session).get_or_create(org_id)

    service = RepoIngestionService(db_session)
    url = f"https://github.com/example/onboard-{uuid.uuid4().hex[:8]}"

    created = await service.register_repo(org_id=org_id, url=url, name="onboard")
    fetched = await service.get_repo(org_id, created.id)

    assert fetched.id == created.id
    assert fetched.url == url
    assert fetched.org_id == org_id

    await service.repo_dao.delete(created.id)
    await OrganizationDAO(db_session).delete(org_id)
