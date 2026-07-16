from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.file_expertise import FileExpertise


class FileExpertiseDAO(BaseDAO[FileExpertise]):
    model = FileExpertise

    async def list_for_file(self, repo_id: str, file_path: str) -> list[FileExpertise]:
        result = await self.session.execute(
            select(FileExpertise).where(FileExpertise.repo_id == repo_id, FileExpertise.file_path == file_path)
        )
        return list(result.scalars().all())
