from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from onboard.core.common.exceptions import OnboardError
from onboard.core.common.logger import get_logger

logger = get_logger("onboard.errors")

# User-friendly copy for the framework-level HTTP errors FastAPI raises before any service
# runs (unknown route, wrong method, missing/invalid auth). Keeps the client-facing envelope
# ({error, message}) identical to the one OnboardError produces, so the frontend never has to
# special-case FastAPI's default {"detail": ...} shape.
_HTTP_STATUS_MESSAGES: dict[int, str] = {
    401: "Please sign in to continue.",
    403: "You don't have permission to do that.",
    404: "We couldn't find what you were looking for.",
    405: "That action isn't allowed here.",
    429: "Too many requests — please wait a moment and try again.",
}


def _friendly_validation_message(exc: RequestValidationError) -> str:
    """Turn pydantic/FastAPI's list-of-errors into one readable sentence about the first problem."""
    errors = exc.errors()
    if not errors:
        return "Some of the submitted data was invalid. Please check your input and try again."
    first = errors[0]
    location = [str(part) for part in first.get("loc", ()) if part not in ("body", "query", "path")]
    field = " → ".join(location) if location else "input"
    reason = str(first.get("msg", "is invalid")).removeprefix("Value error, ")
    return f"Please check the '{field}' field: {reason}."


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(OnboardError)
    async def onboard_error_handler(request: Request, exc: OnboardError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.__class__.__name__, "message": exc.message},
        )

    @app.exception_handler(NotImplementedError)
    async def not_implemented_handler(request: Request, exc: NotImplementedError) -> JSONResponse:
        return JSONResponse(
            status_code=501,
            content={"error": "NotImplemented", "message": str(exc) or "This feature is not implemented yet"},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": "ValidationError", "message": _friendly_validation_message(exc)},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Prefer our friendly copy; fall back to whatever detail the framework/route provided.
        message = _HTTP_STATUS_MESSAGES.get(exc.status_code)
        if message is None:
            message = str(exc.detail) if exc.detail else "The request could not be completed."
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": "HTTPError", "message": message},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_exception")
        return JSONResponse(
            status_code=500,
            content={"error": "InternalServerError", "message": "An unexpected error occurred"},
        )
