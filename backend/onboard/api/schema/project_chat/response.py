"""Response shapes for the Anthropic-powered "Ask project" generative-UI assistant (PRD §6.3).

`AskContextResponse` is consumed server-to-server by the Next.js AI route (Vercel AI SDK) as the
grounding context for Claude; `DocContentResponse` backs the citation → document viewer in the UI.
"""

from pydantic import BaseModel


class AskDocChunk(BaseModel):
    """A retrieved passage from a project document, carrying enough to cite + open the source."""

    document_id: str
    document_title: str
    content: str
    score: float
    page_start: int | None = None
    page_end: int | None = None


class AskCodeChunk(BaseModel):
    file_path: str
    content: str
    score: float


class AskProjectSummary(BaseModel):
    name: str
    description: str | None = None
    tech_stack: list[str] = []


class AskContextResponse(BaseModel):
    """Everything the model needs to answer + cite: a project blurb and ranked doc/code/commit context."""

    project: AskProjectSummary
    doc_chunks: list[AskDocChunk]
    code_chunks: list[AskCodeChunk]
    commits: list[str]


class DocContentChunk(BaseModel):
    chunk_index: int
    content: str
    page_start: int | None = None
    page_end: int | None = None
    section_title: str | None = None


class DocContentResponse(BaseModel):
    """Ordered extracted text for one document — rendered in the citation viewer sheet."""

    document_id: str
    title: str
    file_type: str | None = None
    chunks: list[DocContentChunk]
