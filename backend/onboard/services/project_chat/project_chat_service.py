"""Free-form "Ask Project" Q&A grounded in a project's docs + repo code, streamed over SSE (PRD §6.3)."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.doc_chunk_dao import DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackDocumentDAO
from onboard.dao.project_dao import ProjectDAO, ProjectRepoDAO
from onboard.services.rag.rag_service import RAGService

_SYSTEM_PROMPT = (
    "You are an onboarding assistant answering questions about a specific software project. "
    "Answer ONLY using the provided context (project documents and repository code). "
    "Cite the file path or document name inline when you use it, e.g. (src/app/main.py). "
    "If the context does not contain enough information to answer, reply exactly: "
    '"I don\'t have enough project context to answer that." Do not invent facts or cite sources not in the context.'
)

_DOC_TOP_K = 6
_CODE_TOP_K = 4


class ProjectChatService:
    """Retrieval-augmented, streaming Q&A over a project's uploaded docs and primary repo code."""

    def __init__(self, session: AsyncSession, llm: LLMClient | None = None):
        self.session = session
        self.llm = llm or get_llm_client()
        self.project_dao = ProjectDAO(session)
        self.project_repo_dao = ProjectRepoDAO(session)
        self.doc_chunk_dao = DocChunkDAO(session)
        self.document_dao = DocPackDocumentDAO(session)
        self.rag = RAGService(session, llm=self.llm)

    async def stream_answer(self, org_id: str, project_id: str, question: str) -> AsyncIterator[dict]:
        """Retrieve grounding context, then stream the answer token-by-token followed by citations.

        Yields dicts on the wire contract: {"type": "token"} deltas, one {"type": "citations"} near the
        end, and {"type": "error"} if the LLM stream fails. The router emits the terminal done event.
        """
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")

        query_embedding = await self.llm.embed(question)

        # --- project documents ---
        doc_hits = await self.doc_chunk_dao.similarity_search_for_project(
            org_id, project_id, query_embedding, top_k=_DOC_TOP_K
        )
        doc_context: list[tuple[str, str]] = []  # (source_label, content)
        title_cache: dict[str, str] = {}
        for chunk, _distance in doc_hits:
            label = title_cache.get(chunk.document_id)
            if label is None:
                document = await self.document_dao.get_by_id_for_org(org_id, chunk.document_id)
                label = document.title if document is not None else chunk.document_id
                title_cache[chunk.document_id] = label
            doc_context.append((label, chunk.content))

        # --- primary repo code (best-effort; projects may have no repo) ---
        code_context: list[tuple[str, str]] = []
        repo_id = await self._primary_repo_id(project_id)
        if repo_id is not None:
            code_hits = await self.rag.retrieve_code(org_id, repo_id, question, top_k=_CODE_TOP_K)
            code_context = [(hit["file_path"], hit["content"]) for hit in code_hits]

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": self._build_user_message(question, doc_context, code_context)},
        ]

        try:
            async for delta in self.llm.stream_chat(messages):
                if delta:
                    yield {"type": "token", "text": delta}
        except Exception as exc:  # keep the stream resilient — surface, don't crash
            yield {"type": "error", "message": str(exc)}
            return

        yield {"type": "citations", "citations": self._build_citations(doc_context, code_context)}

    async def _primary_repo_id(self, project_id: str) -> str | None:
        """The project's primary repo id: `is_primary` if set, else the first linked repo, else None."""
        project_repos = await self.project_repo_dao.list_for_project(project_id)
        if not project_repos:
            return None
        primary = next((pr for pr in project_repos if pr.is_primary), project_repos[0])
        return primary.repo_id

    @staticmethod
    def _build_user_message(
        question: str,
        doc_context: list[tuple[str, str]],
        code_context: list[tuple[str, str]],
    ) -> str:
        blocks: list[str] = []
        for label, content in doc_context:
            blocks.append(f"[Document: {label}]\n{content}")
        for label, content in code_context:
            blocks.append(f"[Code: {label}]\n{content}")
        context = "\n\n".join(blocks) if blocks else "(no context retrieved)"
        return f"Question: {question}\n\nContext:\n{context}"

    @staticmethod
    def _build_citations(
        doc_context: list[tuple[str, str]],
        code_context: list[tuple[str, str]],
    ) -> list[dict]:
        citations: list[dict] = []
        seen: set[str] = set()
        for label, _ in doc_context:
            if label not in seen:
                seen.add(label)
                citations.append({"filePath": label, "source": "doc"})
        for label, _ in code_context:
            if label not in seen:
                seen.add(label)
                citations.append({"filePath": label, "source": "code"})
        return citations
