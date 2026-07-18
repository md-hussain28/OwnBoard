from sqlalchemy import delete, func, select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.code_chunk import CodeChunk


class CodeChunkDAO(BaseDAO[CodeChunk]):
    model = CodeChunk

    async def list_for_repo(self, repo_id: str) -> list[CodeChunk]:
        result = await self.session.execute(select(CodeChunk).where(CodeChunk.repo_id == repo_id))
        return list(result.scalars().all())

    async def similarity_search(
        self, repo_id: str, query_embedding: list[float], *, top_k: int = 5
    ) -> list[tuple[CodeChunk, float]]:
        """Cosine-distance nearest code chunks within one repo (PRD §6.3/§6.4)."""
        distance = CodeChunk.embedding.cosine_distance(query_embedding)
        result = await self.session.execute(
            select(CodeChunk, distance.label("distance"))
            .where(CodeChunk.repo_id == repo_id, CodeChunk.embedding.is_not(None))
            .order_by(distance)
            .limit(top_k)
        )
        return [(row[0], float(row[1])) for row in result.all()]

    async def list_pending(self, limit: int, repo_id: str | None = None) -> list[CodeChunk]:
        """Chunks awaiting an embedding — drained by the off-dyno embedding job.

        Across all repos by default (the cron job), or scoped to one repo (the admin manual trigger).
        """
        stmt = select(CodeChunk).where(CodeChunk.embedding.is_(None))
        if repo_id is not None:
            stmt = stmt.where(CodeChunk.repo_id == repo_id)
        result = await self.session.execute(stmt.limit(limit))
        return list(result.scalars().all())

    async def count_pending(self, repo_id: str | None = None) -> int:
        stmt = select(func.count()).select_from(CodeChunk).where(CodeChunk.embedding.is_(None))
        if repo_id is not None:
            stmt = stmt.where(CodeChunk.repo_id == repo_id)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def count_for_repo(self, repo_id: str) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(CodeChunk).where(CodeChunk.repo_id == repo_id)
        )
        return int(result.scalar_one())

    async def delete_for_repo(self, repo_id: str) -> None:
        await self.session.execute(delete(CodeChunk).where(CodeChunk.repo_id == repo_id))
