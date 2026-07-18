"""Translate the project-chat service's semantic events into the Vercel AI SDK "UI message stream".

The frontend uses the Vercel AI SDK (`useChat` + AI Elements). Rather than invent a bespoke wire
format, we speak the SDK's native UI-message-stream SSE protocol from Python so `useChat` consumes it
with no client-side adapter — the same approach as our CompanyInsight service.

Each event is a `data: <json>\\n\\n` frame. The part sequence we emit:

    start
    (text-start → text-delta* → text-end)   # one block per contiguous run of prose
    (tool-input-available → tool-output-available)   # one pair per generative-UI display tool
    ...                                       # text and tool blocks interleave in call order
    finish
    [DONE]

Our "display tools" have no server-side effect — the tool *input* is the payload the frontend renders
(a chart, checklist, citations, …). We still emit `tool-output-available` so the AI SDK marks the part
`output-available`; the client renders off `part.input`.
"""

import json
import uuid
from collections.abc import AsyncIterator


def _frame(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def to_ui_message_stream(events: AsyncIterator[dict]) -> AsyncIterator[str]:
    """Wrap the service's semantic event stream as Vercel UI-message-stream SSE frames.

    Consumes `{"type":"text","text"}`, `{"type":"component","id","name","input"}`, and
    `{"type":"error","message"}`; guarantees a single open text block at a time (closing it before any
    tool/error part) and always terminates with `finish` + `[DONE]`.
    """
    yield _frame({"type": "start", "messageId": f"msg-{uuid.uuid4().hex}"})

    text_id: str | None = None

    def close_text() -> str | None:
        nonlocal text_id
        if text_id is not None:
            frame = _frame({"type": "text-end", "id": text_id})
            text_id = None
            return frame
        return None

    try:
        async for event in events:
            kind = event.get("type")

            if kind == "text":
                delta = event.get("text") or ""
                if not delta:
                    continue
                if text_id is None:
                    text_id = f"txt-{uuid.uuid4().hex}"
                    yield _frame({"type": "text-start", "id": text_id})
                yield _frame({"type": "text-delta", "id": text_id, "delta": delta})

            elif kind == "component":
                closing = close_text()
                if closing:
                    yield closing
                tool_call_id = event.get("id") or f"call-{uuid.uuid4().hex}"
                yield _frame(
                    {
                        "type": "tool-input-available",
                        "toolCallId": tool_call_id,
                        "toolName": event.get("name"),
                        "input": event.get("input") or {},
                    }
                )
                yield _frame(
                    {
                        "type": "tool-output-available",
                        "toolCallId": tool_call_id,
                        "output": {"rendered": True},
                    }
                )

            elif kind == "error":
                closing = close_text()
                if closing:
                    yield closing
                yield _frame({"type": "error", "errorText": event.get("message") or "Something went wrong."})
    except Exception as exc:  # never leave the stream half-open — surface + terminate cleanly
        closing = close_text()
        if closing:
            yield closing
        yield _frame({"type": "error", "errorText": str(exc)})
    else:
        closing = close_text()
        if closing:
            yield closing

    yield _frame({"type": "finish"})
    yield "data: [DONE]\n\n"
