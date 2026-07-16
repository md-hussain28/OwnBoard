from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.expertise_availability import ExpertiseAvailability


class ExpertiseAvailabilityDAO(BaseDAO[ExpertiseAvailability]):
    model = ExpertiseAvailability

    async def get_for_contributor(self, contributor_id: str) -> ExpertiseAvailability | None:
        result = await self.session.execute(
            select(ExpertiseAvailability).where(ExpertiseAvailability.contributor_id == contributor_id)
        )
        return result.scalar_one_or_none()
