"""Aggregated manager views: bus-factor heatmap + quiz analytics (PRD §6.8).

Thin composition over already-computed data — the bus-factor heatmap reuses the deterministic
skill-graph engine, and quiz analytics is a single aggregate query. Nothing heavy runs here.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.dao.models.employee import Employee
from onboard.dao.models.quiz_attempt import QuizAttempt
from onboard.dao.repo_dao import RepoDAO
from onboard.services.skill_graph.skill_graph_service import SkillGraphService


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo_dao = RepoDAO(session)
        self.skill_graph = SkillGraphService(session)

    async def get_bus_factor_heatmap(self, org_id: str, repo_id: str) -> dict:
        files = await self.skill_graph.compute_bus_factor(org_id, repo_id)
        return {"repo_id": repo_id, "files": files}

    async def get_quiz_analytics(self, org_id: str, repo_id: str) -> dict:
        if await self.repo_dao.get_by_id_for_org(org_id, repo_id) is None:
            raise NotFoundError(f"Repo {repo_id} not found")
        # quiz_attempt has no org_id — scope through employee (PRD §5). Org-wide (attempts aren't repo-bound yet).
        result = await self.session.execute(
            select(
                func.count(QuizAttempt.id),
                func.count().filter(QuizAttempt.passed.is_(True)),
                func.avg(QuizAttempt.score),
            )
            .join(Employee, Employee.id == QuizAttempt.employee_id)
            .where(Employee.org_id == org_id, QuizAttempt.completed_at.is_not(None))
        )
        total, passed, avg_score = result.one()
        total = int(total or 0)
        return {
            "repo_id": repo_id,
            "total_attempts": total,
            "pass_rate": round((passed or 0) / total, 3) if total else 0.0,
            "average_score": round(float(avg_score), 3) if avg_score is not None else 0.0,
        }
