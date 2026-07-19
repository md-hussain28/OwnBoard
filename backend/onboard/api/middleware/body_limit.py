"""Hard cap on request body size, enforced before the body is buffered.

FastAPI/uvicorn have NO built-in request-body limit: a single large POST (e.g. a git-snapshot
push to /ingest) is read fully into memory and JSON-parsed before any validation runs, which can
OOM the 512MB host on its own. This ASGI middleware rejects oversized requests from the
Content-Length header alone — nothing is read — so no endpoint can be handed a body bigger than
the budget. Bodies with no declared length (chunked uploads; no real client of this API sends
them) are refused outright rather than trusted-and-counted.
"""

import json

from onboard.config.constants import MAX_REQUEST_BODY_BYTES


class BodySizeLimitMiddleware:
    def __init__(self, app, max_bytes: int = MAX_REQUEST_BODY_BYTES):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length: int | None = None
        chunked = False
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    content_length = int(value)
                except ValueError:
                    await _reject(send, 400, "Invalid Content-Length header")
                    return
            elif name == b"transfer-encoding" and b"chunked" in value.lower():
                chunked = True

        if content_length is not None and content_length > self.max_bytes:
            await _reject(send, 413, f"Request body exceeds {self.max_bytes // (1024 * 1024)}MB limit")
            return
        if content_length is None and chunked:
            await _reject(send, 411, "Chunked request bodies are not accepted — send Content-Length")
            return

        await self.app(scope, receive, send)


async def _reject(send, status: int, detail: str) -> None:
    body = json.dumps({"detail": detail}).encode()
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})
