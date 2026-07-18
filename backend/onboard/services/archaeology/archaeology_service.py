"""Archaeology-mode Q&A: "why does X work this way", answered from code + commit provenance (PRD §6.4).

Grounded and honest by construction: it retrieves real code chunks and recent commit records, asks
the LLM to answer *only* from that context and self-report a confidence, and — below a threshold —
refuses to guess. Instead it escalates to the best human expert with cited evidence (PRD §6.4/§7).
The escalation reuses the deterministic expert-routing engine, so it still names a person even when
the LLM is unavailable.
"""

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import ARCHAEOLOGY_CONFIDENCE_THRESHOLD
from onboard.core.common.exceptions import NotFoundError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.commit_record_dao import CommitRecordDAO
from onboard.dao.repo_dao import RepoDAO
from onboard.services.expert_routing.expert_routing_service import ExpertRoutingService
from onboard.services.rag.rag_service import RAGService


class _LLMCitation(BaseModel):
    file_path: str
    commit_sha: str | None = None
    summary: str


class _LLMAnswer(BaseModel):
    answer: str
    citations: list[_LLMCitation]
    confidence: float  # 0..1, how well the provided context supports the answer


class ArchaeologyService:
    def __init__(self, session: AsyncSession, llm: LLMClient | None = None):
        self.session = session
        self.llm = llm or get_llm_client()
        self.repo_dao = RepoDAO(session)
        self.commit_dao = CommitRecordDAO(session)
        self.rag = RAGService(session, llm=self.llm)
        self.experts = ExpertRoutingService(session, llm=self.llm)

    async def answer_question(self, org_id: str, repo_id: str, question: str) -> dict:
        if await self.repo_dao.get_by_id_for_org(org_id, repo_id) is None:
            raise NotFoundError(f"Repo {repo_id} not found")

        try:
            hits = await self.rag.retrieve_code(org_id, repo_id, question, top_k=6)
        except Exception:
            hits = []

        top_file = hits[0]["file_path"] if hits else None

        if not hits:
            return await self._escalate(
                org_id,
                repo_id,
                top_file,
                answer=(
                    "I don't have enough indexed code to answer that confidently yet. "
                    "Here's the best person to ask instead."
                ),
                confidence=0.0,
            )

        commits = await self.commit_dao.list_recent_for_repo(repo_id, limit=15)
        parsed = await self._ask_llm(question, hits, commits)

        if parsed is None or parsed.confidence < ARCHAEOLOGY_CONFIDENCE_THRESHOLD:
            confidence = parsed.confidence if parsed else 0.0
            return await self._escalate(
                org_id,
                repo_id,
                top_file,
                answer=(
                    "I'm not confident enough to answer that from the code alone, so I won't guess. "
                    "Here's the person best placed to explain it."
                ),
                confidence=confidence,
            )

        return {
            "answer": parsed.answer,
            "citations": [c.model_dump() for c in parsed.citations],
            "confidence": round(parsed.confidence, 3),
            "escalated": False,
            "expert": None,
        }

    async def _ask_llm(self, question: str, hits: list[dict], commits) -> _LLMAnswer | None:
        code_context = "\n\n".join(f"[FILE {h['file_path']}]\n{h['content'][:1500]}" for h in hits)
        commit_context = "\n".join(f"[COMMIT {c.hash[:10]}] {c.message.splitlines()[0][:160]}" for c in commits)
        messages = [
            {
                "role": "system",
                "content": (
                    "You answer questions about a codebase using ONLY the provided code and commit "
                    "context. Cite the specific files (and commit hashes when relevant) you used. "
                    "Set confidence to how well the context actually supports your answer — if the "
                    "context doesn't clearly answer the question, set confidence low and say so. "
                    "Never invent file paths or facts not present in the context."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\n=== CODE CONTEXT ===\n{code_context}\n\n"
                    f"=== RECENT COMMITS ===\n{commit_context}"
                ),
            },
        ]
        try:
            return await self.llm.parse(messages, _LLMAnswer)
        except Exception:
            return None

    async def _escalate(self, org_id, repo_id, file_path, *, answer: str, confidence: float) -> dict:
        expert = None
        if file_path:
            try:
                routed = await self.experts.route_to_expert(org_id, repo_id, file_path, draft=True)
                expert = {
                    "contributor_name": routed["contributor_name"],
                    "evidence": routed["evidence"],
                    "draft_message": routed["draft_message"],
                }
            except NotFoundError:
                expert = None
        return {
            "answer": answer,
            "citations": [],
            "confidence": round(confidence, 3),
            "escalated": True,
            "expert": expert,
        }
