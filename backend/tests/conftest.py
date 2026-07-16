from collections.abc import AsyncGenerator

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.database.postgres import get_session_factory


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session
        await session.rollback()
