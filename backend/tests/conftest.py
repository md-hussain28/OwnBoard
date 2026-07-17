from collections.abc import AsyncGenerator

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.database.postgres import dispose_engine, get_session_factory


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session
        await session.rollback()
    # pytest-asyncio gives each test its own event loop; the engine/pool are module-level singletons
    # bound to the loop that first built them. Dispose after each test so the next test rebuilds the
    # engine on its own loop instead of terminating a pooled connection on a closed loop.
    await dispose_engine()
