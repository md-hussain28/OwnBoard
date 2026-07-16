from sqlalchemy.ext.asyncio import AsyncSession


class ExpertRoutingService:
    """Routes new hires to the right expert for a file based on skill graph (PRD §6.6)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def route_to_expert(self, repo_id: str, file_path: str):
        raise NotImplementedError("route_to_expert is not implemented yet")
