from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.quiz_template import QuizTemplate, QuizType


class QuizTemplateDAO(BaseDAO[QuizTemplate]):
    model = QuizTemplate

    async def list_by_type(self, type: QuizType) -> list[QuizTemplate]:
        result = await self.session.execute(select(QuizTemplate).where(QuizTemplate.type == type))
        return list(result.scalars().all())
