import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.project_chat.request import AskProjectRequest

router = APIRouter(prefix="/projects", tags=["project-chat"])

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


@router.post("/{project_id}/ask")
async def ask_project(
    project_id: str,
    payload: AskProjectRequest,
    org_id: CurrentOrgId,
    services: ServiceContainer = Depends(get_service_container),
) -> StreamingResponse:
    """Stream a grounded answer to a free-form question about a project over SSE (PRD §6.3).

    Wire contract (`text/event-stream`, one `data: <json>\\n\\n` per message): many
    `{"type":"token"}` deltas, one `{"type":"citations"}` near the end, `{"type":"error"}` on failure,
    and always a terminal `{"type":"done"}`.
    """

    async def event_stream() -> AsyncIterator[str]:
        try:
            async for event in services.project_chat.stream_answer(org_id, project_id, payload.question):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=_SSE_HEADERS)
