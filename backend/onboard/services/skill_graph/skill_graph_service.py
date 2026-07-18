"""Deterministic, LLM-free skill-graph and bus-factor computation (PRD §6.2).

Reads the `file_expertise` rows produced at ingest time (their recency/revert-adjusted score is
computed there) and shapes them into the two skill-graph surfaces: per-file expertise and per-file
bus-factor risk. No LLM, no external calls — fast and demo-reliable on the 0.1-CPU host.
"""

from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.dao.file_expertise_dao import FileExpertiseDAO
from onboard.dao.models.file_expertise import FileExpertise
from onboard.dao.repo_dao import RepoDAO


def subsystem_of(file_path: str) -> str:
    """The first path segment — our unit of 'subsystem' for bus-factor aggregation."""
    head, _, _ = file_path.lstrip("/").partition("/")
    return head or file_path


def risk_level(top_share: float, contributor_count: int) -> str:
    """Concentration → risk. One contributor (bus factor = 1) is always high (PRD §7)."""
    if contributor_count <= 1 or top_share >= 0.8:
        return "high"
    if top_share >= 0.5:
        return "medium"
    return "low"


class SkillGraphService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo_dao = RepoDAO(session)
        self.file_expertise_dao = FileExpertiseDAO(session)

    async def _require_repo(self, org_id: str, repo_id: str) -> None:
        if await self.repo_dao.get_by_id_for_org(org_id, repo_id) is None:
            raise NotFoundError(f"Repo {repo_id} not found")

    async def compute_expertise_scores(self, org_id: str, repo_id: str) -> list[dict]:
        await self._require_repo(org_id, repo_id)
        rows = await self.file_expertise_dao.list_for_repo(repo_id)
        return [
            {
                "file_path": row.file_path,
                "contributor_id": row.contributor_id,
                "contributor_name": row.contributor.name if row.contributor else row.contributor_id,
                "commit_count": row.commit_count,
                "review_count": row.review_count,
                "revert_adjusted_score": row.revert_adjusted_score,
                "last_commit_at": row.last_commit_at,
            }
            for row in rows
        ]

    async def compute_bus_factor(self, org_id: str, repo_id: str) -> list[dict]:
        await self._require_repo(org_id, repo_id)
        rows = await self.file_expertise_dao.list_for_repo(repo_id)

        by_file: dict[str, list[FileExpertise]] = defaultdict(list)
        for row in rows:
            by_file[row.file_path].append(row)

        result: list[dict] = []
        for file_path, entries in by_file.items():
            ranked = sorted(entries, key=lambda e: e.revert_adjusted_score, reverse=True)
            total = sum(e.revert_adjusted_score for e in ranked) or 1.0
            top_share = ranked[0].revert_adjusted_score / total
            result.append(
                {
                    "file_path": file_path,
                    "risk_level": risk_level(top_share, len(ranked)),
                    "top_contributor_ids": [e.contributor_id for e in ranked[:2]],
                }
            )
        # Surface the riskiest files first — that's what a manager scans for.
        risk_order = {"high": 0, "medium": 1, "low": 2}
        result.sort(key=lambda r: (risk_order.get(r["risk_level"], 3), r["file_path"]))
        return result
