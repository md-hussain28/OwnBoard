from sqlalchemy.ext.asyncio import AsyncSession


class ArchaeologyService:
    """Grounded Q&A over a repo's git history and code (PRD §6.4)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def answer_question(self, repo_id: str, question: str):
        raise NotImplementedError("answer_question is not implemented yet")
