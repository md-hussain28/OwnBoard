from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.institutional_memory_note import InstitutionalMemoryNote


class InstitutionalMemoryNoteDAO(BaseDAO[InstitutionalMemoryNote]):
    model = InstitutionalMemoryNote

    async def list_for_contributor(self, contributor_id: str) -> list[InstitutionalMemoryNote]:
        result = await self.session.execute(
            select(InstitutionalMemoryNote).where(InstitutionalMemoryNote.contributor_id == contributor_id)
        )
        return list(result.scalars().all())
