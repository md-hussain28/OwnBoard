from sqlalchemy.ext.asyncio import AsyncSession


class RAGService:
    """Chunking, embedding and retrieval over code/policy content (PRD §6.1/§6.3)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def chunk_and_embed(self, repo_id: str):
        raise NotImplementedError("chunk_and_embed is not implemented yet")

    async def retrieve(self, repo_id: str, query: str):
        raise NotImplementedError("retrieve is not implemented yet")
