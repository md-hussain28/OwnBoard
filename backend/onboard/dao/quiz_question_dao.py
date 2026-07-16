from typing import Any

from sqlalchemy import delete, select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.quiz_question import QuizQuestion


class QuizQuestionDAO(BaseDAO[QuizQuestion]):
    model = QuizQuestion

    async def list_for_template(self, quiz_template_id: str) -> list[QuizQuestion]:
        result = await self.session.execute(
            select(QuizQuestion)
            .where(QuizQuestion.quiz_template_id == quiz_template_id)
            .order_by(QuizQuestion.created_at.asc())
        )
        return list(result.scalars().all())

    async def bulk_create(self, rows: list[dict[str, Any]]) -> list[QuizQuestion]:
        instances = [QuizQuestion(**row) for row in rows]
        self.session.add_all(instances)
        await self.session.commit()
        for instance in instances:
            await self.session.refresh(instance)
        return instances

    async def delete_many(self, question_ids: list[str]) -> None:
        if not question_ids:
            return
        await self.session.execute(delete(QuizQuestion).where(QuizQuestion.id.in_(question_ids)))
        await self.session.commit()

    async def delete_for_template(self, quiz_template_id: str) -> None:
        await self.session.execute(delete(QuizQuestion).where(QuizQuestion.quiz_template_id == quiz_template_id))
        await self.session.commit()
