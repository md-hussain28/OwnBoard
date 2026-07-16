from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from onboard.api.exception_handlers import register_exception_handlers
from onboard.api.middleware.logging import RequestLoggingMiddleware
from onboard.api.routes import (
    chat_router,
    dashboard_router,
    employee_router,
    expert_router,
    health_router,
    quiz_router,
    rag_router,
    repo_router,
    skill_graph_router,
)
from onboard.config.constants import APP_DESCRIPTION, APP_TITLE
from onboard.config.settings import get_settings
from onboard.core.common.logger import configure_logging, get_logger
from onboard.core.database.postgres import dispose_engine, ensure_vector_extension

settings = get_settings()
configure_logging(settings.LOG_LEVEL)
logger = get_logger("onboard.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_vector_extension()
    logger.info("startup_complete")
    yield
    await dispose_engine()
    logger.info("shutdown_complete")


def create_app() -> FastAPI:
    app = FastAPI(title=APP_TITLE, description=APP_DESCRIPTION, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    register_exception_handlers(app)

    app.include_router(health_router.router)

    prefix = settings.API_VERSION_PREFIX
    app.include_router(repo_router.router, prefix=prefix)
    app.include_router(employee_router.router, prefix=prefix)
    app.include_router(skill_graph_router.router, prefix=prefix)
    app.include_router(rag_router.router, prefix=prefix)
    app.include_router(quiz_router.router, prefix=prefix)
    app.include_router(chat_router.router, prefix=prefix)
    app.include_router(expert_router.router, prefix=prefix)
    app.include_router(dashboard_router.router, prefix=prefix)

    @app.get("/")
    async def root() -> dict[str, str]:
        return {"name": APP_TITLE, "environment": settings.ENVIRONMENT, "docs": "/docs"}

    return app


app = create_app()


def dev() -> None:
    uvicorn.run("onboard.main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)


if __name__ == "__main__":
    dev()
