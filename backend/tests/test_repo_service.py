import uuid

import pytest

from onboard.services.repo_ingestion.repo_ingestion_service import RepoIngestionService


@pytest.mark.asyncio
async def test_register_and_fetch_repo(db_session):
    service = RepoIngestionService(db_session)
    url = f"https://github.com/example/onboard-{uuid.uuid4().hex[:8]}"

    created = await service.register_repo(url=url, name="onboard")
    fetched = await service.get_repo(created.id)

    assert fetched.id == created.id
    assert fetched.url == url

    await service.repo_dao.delete(created.id)
