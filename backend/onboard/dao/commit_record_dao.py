from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.commit_record import CommitRecord


class CommitRecordDAO(BaseDAO[CommitRecord]):
    model = CommitRecord

    async def get_by_hash(self, repo_id: str, hash: str) -> CommitRecord | None:
        result = await self.session.execute(
            select(CommitRecord).where(CommitRecord.repo_id == repo_id, CommitRecord.hash == hash)
        )
        return result.scalar_one_or_none()
