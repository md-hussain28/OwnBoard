from sqlalchemy import select
from sqlalchemy.orm import selectinload

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.quiz_template import QuizTemplate, QuizType


class QuizTemplateDAO(BaseDAO[QuizTemplate]):
    model = QuizTemplate

    async def list_by_type(self, type: QuizType) -> list[QuizTemplate]:
        result = await self.session.execute(select(QuizTemplate).where(QuizTemplate.type == type))
        return list(result.scalars().all())

    async def get_with_questions(self, template_id: str) -> QuizTemplate | None:
        result = await self.session.execute(
            select(QuizTemplate).where(QuizTemplate.id == template_id).options(selectinload(QuizTemplate.questions))
        )
        return result.scalar_one_or_none()

    async def get_latest_for_source(self, source_ref: str, type: QuizType) -> QuizTemplate | None:
        """Most recently created template for this source, published or not — the "current working" version."""
        result = await self.session.execute(
            select(QuizTemplate)
            .where(QuizTemplate.source_ref == source_ref, QuizTemplate.type == type)
            .options(selectinload(QuizTemplate.questions))
            .order_by(QuizTemplate.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_latest_published_for_source(self, source_ref: str, type: QuizType) -> QuizTemplate | None:
        """The template new assignments should be pointed at — the newest *published* version."""
        result = await self.session.execute(
            select(QuizTemplate)
            .where(
                QuizTemplate.source_ref == source_ref,
                QuizTemplate.type == type,
                QuizTemplate.is_published.is_(True),
            )
            .options(selectinload(QuizTemplate.questions))
            .order_by(QuizTemplate.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
