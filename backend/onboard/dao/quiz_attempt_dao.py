from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.quiz_attempt import QuizAttempt


class QuizAttemptDAO(BaseDAO[QuizAttempt]):
    model = QuizAttempt

    async def list_for_employee(self, employee_id: str) -> list[QuizAttempt]:
        result = await self.session.execute(select(QuizAttempt).where(QuizAttempt.employee_id == employee_id))
        return list(result.scalars().all())
