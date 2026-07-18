from contextlib import asynccontextmanager

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from onboard.api.dependency.auth import require_org, require_user
from onboard.api.exception_handlers import register_exception_handlers
from onboard.api.middleware.logging import RequestLoggingMiddleware
from onboard.api.routes import (
    auth_router,
    chat_router,
    dashboard_router,
    doc_pack_router,
    employee_router,
    expert_router,
    health_router,
    ingest_router,
    notification_router,
    org_domain_router,
    pack_assignment_router,
    project_chat_router,
    project_docs_router,
    project_router,
    quiz_domain_router,
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
    logger.info(
        "startup_begin",
        extra={"environment": settings.ENVIRONMENT, "is_prod": settings.is_prod},
    )
    try:
        await ensure_vector_extension()
    except Exception:
        logger.exception(
            "startup_db_failed — check ENVIRONMENT=prod|production and DATABASE_URL_PROD "
            "(use postgresql+asyncpg://…?ssl=require for Neon)"
        )
        raise
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
    protected = [Depends(require_user)]
    # Every domain below is tenant-owned data, so in addition to authenticating the user, require an active
    # Clerk organization on the session token. Individual routes still resolve org_id via `CurrentOrgId`
    # (api/dependency/tenancy.py) — this is a second, router-level guarantee that can't be forgotten per-route.
    tenant_scoped = [Depends(require_user), Depends(require_org)]
    app.include_router(auth_router.router, prefix=prefix, dependencies=protected)
    app.include_router(repo_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(employee_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(org_domain_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(quiz_domain_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(doc_pack_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(pack_assignment_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(project_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(project_docs_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(project_chat_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(notification_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(skill_graph_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(rag_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(quiz_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(chat_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(expert_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(dashboard_router.router, prefix=prefix, dependencies=tenant_scoped)
    app.include_router(ingest_router.ingest_key_router, prefix=prefix, dependencies=tenant_scoped)
    # Push ingestion: authenticated by a per-repo API key (see api/dependency/ingest_auth.py), NOT Clerk —
    # so it is deliberately registered WITHOUT tenant_scoped. It still validates the key + payload caps
    # before touching the DB, guarding the 512MB host.
    app.include_router(ingest_router.ingest_router, prefix=prefix)

    @app.get("/")
    async def root() -> dict[str, str]:
        return {"name": APP_TITLE, "environment": settings.ENVIRONMENT, "docs": "/docs"}

    return app


app = create_app()


def dev() -> None:
    uvicorn.run(
        "onboard.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
    )


def run() -> None:
    """Production entrypoint (Render/etc). Honors $PORT when set."""
    import os

    port = int(os.environ.get("PORT", settings.API_PORT))
    uvicorn.run("onboard.main:app", host=settings.API_HOST, port=port, reload=False)


if __name__ == "__main__":
    run() if settings.is_prod else dev()
