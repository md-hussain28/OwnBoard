from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.quiz_question import QuizQuestion


class QuizQuestionDAO(BaseDAO[QuizQuestion]):
    model = QuizQuestion

    async def list_for_template(self, quiz_template_id: str) -> list[QuizQuestion]:
        result = await self.session.execute(
            select(QuizQuestion).where(QuizQuestion.quiz_template_id == quiz_template_id)
        )
        return list(result.scalars().all())
