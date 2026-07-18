"""Routes a new hire to the right expert for a file/subsystem (PRD §6.6).

Candidate selection is deterministic — aggregate the recency/revert-adjusted expertise score per
contributor over the matched files, filter out anyone who opted out of routing
(`expertise_availability`), and pick a primary + backup. Only the *introduction message* uses the
LLM, and only as a best-effort nicety: the evidence bullets that justify the match are computed
without it, so routing still works (and stays cited) when the LLM is unavailable.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.expertise_availability_dao import ExpertiseAvailabilityDAO
from onboard.dao.file_expertise_dao import FileExpertiseDAO
from onboard.dao.models.file_expertise import FileExpertise
from onboard.dao.repo_dao import RepoDAO


@dataclass
class _Candidate:
    contributor_id: str
    name: str
    score: float = 0.0
    commit_count: int = 0
    review_count: int = 0
    files: set[str] = field(default_factory=set)
    last_commit_at: datetime | None = None


class ExpertRoutingService:
    def __init__(self, session: AsyncSession, llm: LLMClient | None = None):
        self.session = session
        self.llm = llm or get_llm_client()
        self.repo_dao = RepoDAO(session)
        self.file_expertise_dao = FileExpertiseDAO(session)
        self.availability_dao = ExpertiseAvailabilityDAO(session)

    async def _require_repo(self, org_id: str, repo_id: str) -> None:
        if await self.repo_dao.get_by_id_for_org(org_id, repo_id) is None:
            raise NotFoundError(f"Repo {repo_id} not found")

    async def _matched_rows(self, repo_id: str, file_path: str) -> list[FileExpertise]:
        """Exact-file expertise, falling back to the file's own directory when the file is unknown."""
        rows = await self.file_expertise_dao.list_for_file(repo_id, file_path)
        if rows:
            return rows
        cleaned = file_path.lstrip("/")
        directory, sep, _ = cleaned.rpartition("/")
        prefix = f"{directory}/" if sep else cleaned
        return await self.file_expertise_dao.list_for_subsystem(repo_id, prefix)

    async def _is_available(self, contributor_id: str) -> bool:
        record = await self.availability_dao.get_for_contributor(contributor_id)
        return record is None or record.available

    async def route_to_expert(self, org_id: str, repo_id: str, file_path: str, *, draft: bool = True) -> dict:
        await self._require_repo(org_id, repo_id)
        rows = await self._matched_rows(repo_id, file_path)
        if not rows:
            raise NotFoundError(f"No expertise data for '{file_path}' yet — has this repo been ingested?")

        candidates: dict[str, _Candidate] = defaultdict(lambda: _Candidate(contributor_id="", name=""))
        for row in rows:
            c = candidates[row.contributor_id]
            c.contributor_id = row.contributor_id
            c.name = row.contributor.name if row.contributor else row.contributor_id
            c.score += row.revert_adjusted_score
            c.commit_count += row.commit_count
            c.review_count += row.review_count
            c.files.add(row.file_path)
            if row.last_commit_at and (c.last_commit_at is None or row.last_commit_at > c.last_commit_at):
                c.last_commit_at = row.last_commit_at

        ranked = sorted(candidates.values(), key=lambda c: c.score, reverse=True)
        total = sum(c.score for c in ranked) or 1.0

        available = [c for c in ranked if await self._is_available(c.contributor_id)]
        if not available:
            raise NotFoundError(f"Everyone with expertise in '{file_path}' has opted out of routing (bus-factor risk)")

        primary = available[0]
        backup = available[1] if len(available) > 1 else None
        confidence = round(primary.score / total, 3)
        evidence = self._evidence(primary, file_path)
        draft_message = await self._draft_intro(primary, file_path, evidence) if draft else None

        return {
            "contributor_id": primary.contributor_id,
            "contributor_name": primary.name,
            "confidence": confidence,
            "evidence": evidence,
            "draft_message": draft_message,
            "backup_contributor_name": backup.name if backup else None,
        }

    def _evidence(self, c: _Candidate, file_path: str) -> list[str]:
        where = file_path if file_path in c.files else f"{len(c.files)} related file(s)"
        bullets = [f"Authored {c.commit_count} commit(s) touching {where}"]
        if c.review_count:
            bullets.append(f"Reviewed {c.review_count} change(s) in this area")
        if c.last_commit_at:
            bullets.append(f"Most recent contribution {c.last_commit_at.date().isoformat()}")
        return bullets

    async def _draft_intro(self, c: _Candidate, file_path: str, evidence: list[str]) -> str | None:
        """Best-effort LLM-drafted intro grounded in the evidence bullets (PRD §6.6)."""
        try:
            evidence_text = "\n".join(f"- {b}" for b in evidence)
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You draft a short, warm introduction message a new hire can send to an internal "
                        "expert. 2-3 sentences, first person, reference the specific evidence, no fluff."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"I'm a new hire trying to understand `{file_path}`. Draft a message asking "
                        f"{c.name} for a quick pointer. Evidence they're the right person:\n{evidence_text}"
                    ),
                },
            ]
            return (await self.llm.chat(messages)).strip() or None
        except Exception:
            # Routing must never fail just because the LLM is down — evidence already justifies the match.
            return None
