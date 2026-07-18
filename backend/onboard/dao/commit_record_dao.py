from sqlalchemy import delete, select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.commit_record import CommitRecord


class CommitRecordDAO(BaseDAO[CommitRecord]):
    model = CommitRecord

    async def get_by_hash(self, repo_id: str, hash: str) -> CommitRecord | None:
        result = await self.session.execute(
            select(CommitRecord).where(CommitRecord.repo_id == repo_id, CommitRecord.hash == hash)
        )
        return result.scalar_one_or_none()

    async def list_recent_for_repo(self, repo_id: str, limit: int = 50) -> list[CommitRecord]:
        result = await self.session.execute(
            select(CommitRecord)
            .where(CommitRecord.repo_id == repo_id)
            .order_by(CommitRecord.committed_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def delete_for_repo(self, repo_id: str) -> None:
        await self.session.execute(delete(CommitRecord).where(CommitRecord.repo_id == repo_id))
