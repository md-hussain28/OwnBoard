from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from onboard.core.common.exceptions import OnboardError
from onboard.core.common.logger import get_logger

logger = get_logger("onboard.errors")


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

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_exception")
        return JSONResponse(
            status_code=500,
            content={"error": "InternalServerError", "message": "An unexpected error occurred"},
        )
