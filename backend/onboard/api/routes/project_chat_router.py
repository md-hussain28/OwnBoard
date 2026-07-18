from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.project_chat.request import AskProjectRequest
from onboard.api.schema.project_chat.response import AskContextResponse, DocContentResponse
from onboard.api.schema.project_chat.vercel_stream import to_ui_message_stream

router = APIRouter(prefix="/projects", tags=["project-chat"])

# `x-vercel-ai-ui-message-stream: v1` tells the AI SDK client this SSE body is the UI message stream.
_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
    "x-vercel-ai-ui-message-stream": "v1",
}


@router.post("/{project_id}/ask")
async def ask_project(
    project_id: str,
    payload: AskProjectRequest,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
) -> StreamingResponse:
    """Stream a grounded, generative-UI answer to a free-form project question over SSE (PRD §6.3).

    The body is the Vercel AI SDK "UI message stream" protocol (see `vercel_stream.py`): `start`,
    `text-start`/`text-delta`/`text-end` for prose, `tool-input-available`/`tool-output-available`
    for each rendered display tool (chart, checklist, citations, …), `finish`, then `[DONE]`. The
    frontend's `useChat` consumes it natively — no client-side adapter.
    """
    history = [turn.model_dump() for turn in payload.history]
    events = services.project_chat.stream_answer(org_id, project_id, payload.question, history=history)
    return StreamingResponse(to_ui_message_stream(events), media_type="text/event-stream", headers=_SSE_HEADERS)


@router.post("/{project_id}/ask/context", response_model=AskContextResponse)
async def ask_project_context(
    project_id: str,
    payload: AskProjectRequest,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
) -> AskContextResponse:
    """Ranked doc/code/commit grounding context as JSON — a debug/inspection view of `/ask` (PRD §6.3).

    Embeddings + pgvector retrieval run here (same path `/ask` uses before generation), exposing the
    `document_id`/`document_title` the streamed answer cites back to real sources.
    """
    context = await services.project_chat.retrieve_context(org_id, project_id, payload.question)
    return AskContextResponse.model_validate(context)


@router.get("/{project_id}/docs/{document_id}/content", response_model=DocContentResponse)
async def get_project_doc_content(
    project_id: str,
    document_id: str,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
) -> DocContentResponse:
    """Ordered extracted text for one project document — opens when a citation is clicked."""
    content = await services.project_chat.get_document_content(org_id, project_id, document_id)
    return DocContentResponse.model_validate(content)
