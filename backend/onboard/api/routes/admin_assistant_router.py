from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from onboard.api.dependency.rbac import CurrentEmployee, RequireAdmin
from onboard.api.dependency.service_container import ServiceContainer, get_service_container
from onboard.api.dependency.tenancy import CurrentOrgId
from onboard.api.schema.project_chat.request import AskProjectRequest
from onboard.api.schema.project_chat.vercel_stream import to_ui_message_stream

router = APIRouter(prefix="/admin/assistant", tags=["admin-assistant"])

# `x-vercel-ai-ui-message-stream: v1` tells the AI SDK client this SSE body is the UI message stream.
_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
    "x-vercel-ai-ui-message-stream": "v1",
}


@router.post("/ask")
async def admin_assistant_ask(
    payload: AskProjectRequest,
    org_id: CurrentOrgId,
    actor: CurrentEmployee,
    _admin: RequireAdmin,
    services: ServiceContainer = Depends(get_service_container),
) -> StreamingResponse:
    """Stream an agentic admin answer over SSE — onboarding analytics + real admin actions (PRD §6.3).

    Admin-gated. The assistant runs a server-side tool loop: it calls real backend services (add a
    member, create a person, assign onboarding, fetch pass/fail stats) and renders results with the
    same generative-UI component catalog as `/projects/{id}/ask`. Body is the Vercel AI SDK UI message
    stream protocol, consumed natively by the frontend's `useChat`.
    """
    history = [turn.model_dump() for turn in payload.history]
    events = services.admin_assistant.stream_answer(org_id, actor, payload.question, history=history)
    return StreamingResponse(to_ui_message_stream(events), media_type="text/event-stream", headers=_SSE_HEADERS)
