"""Generative-UI "Ask Project" Q&A grounded in a project's docs + repo code, streamed over SSE (PRD §6.3).

Retrieval (OpenAI embeddings + pgvector) and generation (OpenAI tool-calling) both run here, on the
backend — the browser never holds a key. The model answers in Markdown AND calls "display tools" that
the frontend renders as charts, checklists, citations, expert cards, etc.

`stream_answer` yields provider-agnostic semantic events — `{"type":"text","text"}` deltas,
`{"type":"component","id","name","input"}` per rendered tool, and `{"type":"error","message"}`. The
router (`vercel_stream.py`) translates these into the Vercel AI SDK "UI message stream" SSE protocol
so the frontend's `useChat` + AI Elements consume them natively.
"""

import json
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.commit_record_dao import CommitRecordDAO
from onboard.dao.doc_chunk_dao import DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackDAO, DocPackDocumentDAO
from onboard.dao.project_dao import ProjectDAO, ProjectMemberDAO, ProjectRepoDAO
from onboard.services.project_chat.prompting import build_system_prompt
from onboard.services.project_chat.tools import TOOLS
from onboard.services.rag.rag_service import RAGService

_DOC_TOP_K = 6
_CODE_TOP_K = 6  # spread across all linked repos
_CODE_PER_REPO_K = 3
_COMMITS_PER_REPO = 6
_COMMITS_TOTAL = 12
_MAX_TOOL_ROUNDS = 2
_MAX_HISTORY_TURNS = 6

# Cheap, zero-latency signals that a question warrants the stronger (complex) model rather than
# the fast default. Deliberately a heuristic — no extra LLM classification call, since this runs
# on a tiny host and we don't want to pay a round-trip just to pick a model.
_COMPLEX_SIGNALS = (
    "architecture",
    "compare",
    "comparison",
    "trade-off",
    "tradeoff",
    "how does",
    "how do",
    "walk me through",
    "end-to-end",
    "end to end",
    "deep dive",
    "in detail",
    "difference between",
    "pros and cons",
    "lifecycle",
    "under the hood",
    "debug",
    "refactor",
    "best way",
    "step by step",
    "explain",
    "why",
)


class ProjectChatService:
    """Retrieval-augmented, streaming, generative-UI Q&A over a project's docs and repo code."""

    def __init__(self, session: AsyncSession, llm: LLMClient | None = None):
        self.session = session
        self.llm = llm or get_llm_client()
        self.project_dao = ProjectDAO(session)
        self.project_repo_dao = ProjectRepoDAO(session)
        self.project_member_dao = ProjectMemberDAO(session)
        self.doc_chunk_dao = DocChunkDAO(session)
        self.doc_pack_dao = DocPackDAO(session)
        self.document_dao = DocPackDocumentDAO(session)
        self.commit_dao = CommitRecordDAO(session)
        self.rag = RAGService(session, llm=self.llm)

    async def stream_answer(
        self,
        org_id: str,
        project_id: str,
        question: str,
        *,
        history: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[dict]:
        """Retrieve context, then stream a grounded answer + generative components over the SSE contract."""
        context = await self.retrieve_context(org_id, project_id, question)

        messages: list[dict[str, Any]] = [{"role": "system", "content": build_system_prompt(context)}]
        for turn in (history or [])[-_MAX_HISTORY_TURNS:]:
            role, content = turn.get("role"), (turn.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": question})

        model = self._select_model(question, history)

        try:
            for _round in range(_MAX_TOOL_ROUNDS):
                tool_calls: list[dict[str, Any]] = []
                async for event in self.llm.stream_chat_tools(messages, TOOLS, model=model):
                    if event["type"] == "text":
                        if event["text"]:
                            yield {"type": "text", "text": event["text"]}
                    elif event["type"] == "tool_calls":
                        tool_calls = event["tool_calls"]

                for call in tool_calls:
                    if call.get("name"):
                        yield {
                            "type": "component",
                            "id": call.get("id"),
                            "name": call["name"],
                            "input": call["arguments"],
                        }

                if not tool_calls:
                    break

                # Acknowledge the display tools so the model can add a short wrap-up next round.
                messages.append(
                    {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": call["id"],
                                "type": "function",
                                "function": {
                                    "name": call["name"],
                                    "arguments": json.dumps(call["arguments"]),
                                },
                            }
                            for call in tool_calls
                            if call.get("id") and call.get("name")
                        ],
                    }
                )
                for call in tool_calls:
                    if call.get("id"):
                        messages.append({"role": "tool", "tool_call_id": call["id"], "content": "rendered"})
        except Exception as exc:  # keep the stream resilient — surface, don't crash
            yield {"type": "error", "message": str(exc)}

    def _select_model(self, question: str, history: list[dict[str, str]] | None) -> str:
        """Pick the fast default vs. the stronger complex model from cheap heuristics on the question.

        Complex if the question is long/multi-part, uses reasoning-heavy phrasing, or the conversation
        already has depth — otherwise the fast model keeps latency and cost low on this small host.
        """
        q = (question or "").lower().strip()
        is_complex = (
            len(q) >= 240
            or len(q.split()) >= 40
            or q.count("?") >= 2
            or any(signal in q for signal in _COMPLEX_SIGNALS)
            or sum(1 for turn in (history or []) if turn.get("role") == "user") >= 4
        )
        return self.llm.chat_model_complex if is_complex else self.llm.chat_model

    async def retrieve_context(self, org_id: str, project_id: str, question: str) -> dict:
        """Retrieve ranked grounding context as structured JSON (also exposed at `/ask/context`)."""
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")

        query_embedding = await self.llm.embed(question)

        doc_hits = await self.doc_chunk_dao.similarity_search_for_project(
            org_id, project_id, query_embedding, top_k=_DOC_TOP_K
        )
        doc_chunks: list[dict] = []
        title_cache: dict[str, str] = {}
        for chunk, distance in doc_hits:
            label = title_cache.get(chunk.document_id)
            if label is None:
                document = await self.document_dao.get_by_id_for_org(org_id, chunk.document_id)
                label = document.title if document is not None else chunk.document_id
                title_cache[chunk.document_id] = label
            doc_chunks.append(
                {
                    "document_id": chunk.document_id,
                    "document_title": label,
                    "content": chunk.content,
                    "score": max(0.0, 1.0 - distance),
                    "page_start": chunk.page_start,
                    "page_end": chunk.page_end,
                }
            )

        project_repos = await self.project_repo_dao.list_for_project(project_id)
        code_hits: list[dict] = []
        for pr in project_repos:
            for hit in await self.rag.retrieve_code(org_id, pr.repo_id, question, top_k=_CODE_PER_REPO_K):
                code_hits.append(hit)
        code_hits.sort(key=lambda h: h.get("score", 0.0), reverse=True)
        code_chunks = [
            {"file_path": h["file_path"], "content": h["content"], "score": h.get("score", 0.0)}
            for h in code_hits[:_CODE_TOP_K]
        ]

        commits = await self._recent_commits_across_repos(project_repos)
        overview = await self._project_overview(org_id, project, project_repos)

        return {
            "project": {
                "name": project.name,
                "description": project.description,
                "tech_stack": self._coerce_tech_stack(project.tech_stack),
            },
            "overview": overview,
            "doc_chunks": doc_chunks,
            "code_chunks": code_chunks,
            "commits": commits,
        }

    async def _project_overview(self, org_id: str, project, project_repos) -> dict:
        """Whole-project facts (repos, team size, document catalog) so answers aren't limited to the
        retrieved chunks — the model always knows what the project IS and what docs exist, even when a
        question doesn't semantically match any chunk. Kept to a few light queries for the small host."""
        member_count = await self.project_member_dao.count_for_project(project.id)

        packs = await self.doc_pack_dao.list_for_project(org_id, project.id)
        doc_catalog: list[dict] = []
        for pack in packs:
            titles = [doc.title for doc in await self.document_dao.list_for_pack(pack.id) if doc.title]
            if titles:
                doc_catalog.append({"pack": pack.name, "documents": titles})

        return {
            "status": getattr(project, "status", None),
            "member_count": member_count,
            "repo_count": len(project_repos),
            "resource_links": self._coerce_links(getattr(project, "resource_links", None)),
            "doc_catalog": doc_catalog,
        }

    @staticmethod
    def _coerce_links(raw) -> list[dict]:
        """`resource_links` is free-form JSONB — normalize to `{label, url}` display rows."""
        if not isinstance(raw, list):
            return []
        links: list[dict] = []
        for item in raw:
            if isinstance(item, dict):
                url = item.get("url") or item.get("href")
                if url:
                    links.append({"label": item.get("label") or item.get("name") or url, "url": str(url)})
        return links

    async def get_document_content(self, org_id: str, project_id: str, document_id: str) -> dict:
        """Ordered extracted text for one project document — backs the citation → viewer sheet."""
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")
        document = await self.document_dao.get_by_id_for_org(org_id, document_id)
        if document is None:
            raise NotFoundError(f"Document {document_id} not found")

        chunks = await self.doc_chunk_dao.list_content_for_document(org_id, document_id)
        return {
            "document_id": document.id,
            "title": document.title,
            "file_type": document.file_type,
            "chunks": [
                {
                    "chunk_index": c.chunk_index,
                    "content": c.content,
                    "page_start": c.page_start,
                    "page_end": c.page_end,
                    "section_title": c.section_title,
                }
                for c in chunks
            ],
        }

    async def _recent_commits_across_repos(self, project_repos) -> list[str]:
        """Recent commit subjects across the project's repos — grounds 'what changed / who did what'."""
        lines: list[str] = []
        for pr in project_repos:
            for commit in await self.commit_dao.list_recent_for_repo(pr.repo_id, limit=_COMMITS_PER_REPO):
                subject = (commit.message or "").strip().splitlines()[0] if commit.message else ""
                if subject:
                    lines.append(subject)
        return lines[:_COMMITS_TOTAL]

    @staticmethod
    def _coerce_tech_stack(raw) -> list[str]:
        """`tech_stack` is free-form JSONB (strings or `{name}` dicts) — flatten to display labels."""
        if not isinstance(raw, list):
            return []
        labels: list[str] = []
        for item in raw:
            if isinstance(item, str) and item.strip():
                labels.append(item.strip())
            elif isinstance(item, dict):
                name = item.get("name") or item.get("label")
                if name:
                    labels.append(str(name))
        return labels
