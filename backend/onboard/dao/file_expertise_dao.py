from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.file_expertise import FileExpertise


class FileExpertiseDAO(BaseDAO[FileExpertise]):
    model = FileExpertise

    async def list_for_file(self, repo_id: str, file_path: str) -> list[FileExpertise]:
        result = await self.session.execute(
            select(FileExpertise)
            .where(FileExpertise.repo_id == repo_id, FileExpertise.file_path == file_path)
            .options(selectinload(FileExpertise.contributor))
            .order_by(FileExpertise.revert_adjusted_score.desc())
        )
        return list(result.scalars().all())

    async def list_for_repo(self, repo_id: str) -> list[FileExpertise]:
        """All expertise rows for a repo, contributor eagerly loaded (skill-graph read path)."""
        result = await self.session.execute(
            select(FileExpertise)
            .where(FileExpertise.repo_id == repo_id)
            .options(selectinload(FileExpertise.contributor))
            .order_by(FileExpertise.file_path, FileExpertise.revert_adjusted_score.desc())
        )
        return list(result.scalars().all())

    async def list_for_subsystem(self, repo_id: str, prefix: str) -> list[FileExpertise]:
        """Expertise rows whose file lives under a subsystem path prefix (expert-routing fallback)."""
        result = await self.session.execute(
            select(FileExpertise)
            .where(FileExpertise.repo_id == repo_id, FileExpertise.file_path.startswith(prefix))
            .options(selectinload(FileExpertise.contributor))
            .order_by(FileExpertise.revert_adjusted_score.desc())
        )
        return list(result.scalars().all())

    async def delete_for_repo(self, repo_id: str) -> None:
        await self.session.execute(delete(FileExpertise).where(FileExpertise.repo_id == repo_id))
