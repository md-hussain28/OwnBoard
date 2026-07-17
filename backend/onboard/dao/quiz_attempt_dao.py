from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.employee import Employee
from onboard.dao.models.quiz_attempt import QuizAttempt


class QuizAttemptDAO(BaseDAO[QuizAttempt]):
    model = QuizAttempt

    async def list_for_employee(self, employee_id: str) -> list[QuizAttempt]:
        result = await self.session.execute(select(QuizAttempt).where(QuizAttempt.employee_id == employee_id))
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, quiz_attempt_id: str) -> QuizAttempt | None:
        """Org-scoped lookup — joins through `employee` since `quiz_attempt` has no `org_id` of its own."""
        result = await self.session.execute(
            select(QuizAttempt)
            .join(Employee, Employee.id == QuizAttempt.employee_id)
            .where(QuizAttempt.id == quiz_attempt_id, Employee.org_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_open_for_employee_template(self, employee_id: str, quiz_template_id: str) -> QuizAttempt | None:
        """Most recent incomplete attempt for this employee + template (for resume)."""
        result = await self.session.execute(
            select(QuizAttempt)
            .where(
                QuizAttempt.employee_id == employee_id,
                QuizAttempt.quiz_template_id == quiz_template_id,
                QuizAttempt.completed_at.is_(None),
            )
            .order_by(QuizAttempt.started_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
