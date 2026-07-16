from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.code_chunk import CodeChunk


class CodeChunkDAO(BaseDAO[CodeChunk]):
    model = CodeChunk

    async def list_for_repo(self, repo_id: str) -> list[CodeChunk]:
        result = await self.session.execute(select(CodeChunk).where(CodeChunk.repo_id == repo_id))
        return list(result.scalars().all())
