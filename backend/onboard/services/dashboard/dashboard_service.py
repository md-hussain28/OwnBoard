from sqlalchemy.ext.asyncio import AsyncSession


class DashboardService:
    """Aggregated views for bus-factor heatmaps and quiz analytics (PRD §6.8)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_bus_factor_heatmap(self, repo_id: str):
        raise NotImplementedError("get_bus_factor_heatmap is not implemented yet")

    async def get_quiz_analytics(self, repo_id: str):
        raise NotImplementedError("get_quiz_analytics is not implemented yet")
