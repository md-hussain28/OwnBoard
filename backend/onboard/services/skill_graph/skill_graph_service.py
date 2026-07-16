from sqlalchemy.ext.asyncio import AsyncSession


class SkillGraphService:
    """Deterministic, LLM-free skill-graph and bus-factor computation (PRD §6.2)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def compute_expertise_scores(self, repo_id: str):
        raise NotImplementedError("compute_expertise_scores is not implemented yet")

    async def compute_bus_factor(self, repo_id: str):
        raise NotImplementedError("compute_bus_factor is not implemented yet")
