# Backend — CLAUDE.md

FastAPI service for OwnBoard. Repo-level context (product, PRD, cross-app conventions): [`../CLAUDE.md`](../CLAUDE.md).

## Architecture

```
api/routes → api/schema → services → dao → core/database
```

Request flow for e.g. `POST /api/v1/repos`:
1. `main.py` routes to a router in `api/routes/`.
2. `Depends(get_service_container)` (`api/dependency/service_container.py`) builds one `ServiceContainer` per request from a shared `AsyncSession` (`Depends(get_db)`, `core/database/postgres.py`); services inside it are lazily constructed on first access.
3. Router calls exactly one `services.<domain>.<method>(...)` — routers hold no business logic.
4. The service (`services/<domain>/<domain>_service.py`) applies business rules and talks to one or more DAOs.
5. The DAO (`dao/<entity>_dao.py`, subclass of `BaseDAO[Model]`) does the actual SQLAlchemy query/commit and returns ORM instances.
6. The router returns the ORM instance(s); FastAPI serializes them through `response_model=<Entity>Response` (Pydantic `from_attributes=True`).

Cross-cutting: `RequestLoggingMiddleware` (request id + timing + JSON log line) wraps every request. All errors funnel through `core/common/exceptions.py` (`OnboardError` → subclass status code, bare `NotImplementedError` → `501`, anything else → `500` + logged) — never raise `HTTPException` directly from a service.

## Directory map

- `api/routes/` — one `APIRouter` per domain, thin.
- `api/schema/<domain>/` — `request.py` (plain `BaseModel`) + `response.py` (`ConfigDict(from_attributes=True)`).
- `api/dependency/` — `db.py` (`get_db`), `service_container.py` (`ServiceContainer` + `get_service_container`).
- `api/middleware/logging.py`, `api/exception_handlers.py`.
- `config/settings.py` — `Settings(BaseSettings)` reads `.env`, `get_settings()` is `@lru_cache`d. `config/constants.py` — app-wide constants.
- `core/common/` — `exceptions.py` (`OnboardError`/`NotFoundError`/`ValidationError`), `ids.py` (`generate_id`), `logger.py`.
- `core/database/postgres.py` — async engine/session singletons, `get_db()`, `ensure_vector_extension()`, `dispose_engine()`.
- `core/llm/llm_client.py` — `LLMClient` wrapping `AsyncOpenAI` (`.embed`, `.chat`); `get_llm_client()` singleton. Not yet wired into any service — this is the hook point for RAG/quiz/archaeology LLM calls.
- `dao/models/` — SQLAlchemy 2.0 declarative models (`Mapped[...]`/`mapped_column`), all inherit `AuditBase` (`id`, `created_at`, `updated_at`). **`dao/models/__init__.py` is the single registry** — a new model must be imported and added to `__all__` there or Alembic autogenerate and the rest of the app won't see it.
- `dao/<entity>_dao.py` — one class per model, extends `BaseDAO[Model]` (get_by_id/list/create/update/delete for free), add domain lookups on top.
- `services/<domain>/<domain>_service.py` — one class per domain, constructed with an `AsyncSession`, builds the DAO(s) it needs, raises `NotFoundError`/`ValidationError` for error cases.

## Adding a new domain endpoint end-to-end

Follow the `repo`/`employee` domains as the reference implementation:

1. **Model** — `dao/models/<entity>.py` extends `AuditBase`; register it in `dao/models/__init__.py`.
2. **Migration** — `alembic revision --autogenerate`, then `make migrate`.
3. **DAO** — `dao/<entity>_dao.py`: `class <Entity>DAO(BaseDAO[<Entity>]): model = <Entity>` plus custom lookups.
4. **Schemas** — `api/schema/<domain>/request.py` + `response.py`.
5. **Service** — `services/<domain>/<domain>_service.py`, one-line docstring citing the relevant PRD section (e.g. `PRD §6.3`).
6. **Wire into `ServiceContainer`** — add a private slot + lazy `@property` in `api/dependency/service_container.py`.
7. **Router** — `api/routes/<domain>_router.py`, `APIRouter(prefix=..., tags=[...])`, each endpoint takes the request schema + `services: ServiceContainer = Depends(get_service_container)`, sets `response_model` and `status_code=201` for creates.
8. **Register the router** in `main.py`.
9. **Path convention** — top-level resources are flat (`/repos`, `/employees`); sub-resources nest under a repo: `/repos/{repo_id}/skill-graph/...`, `/repos/{repo_id}/rag/...`, `/repos/{repo_id}/chat/...`, `/repos/{repo_id}/experts`, `/repos/{repo_id}/dashboard/...`.

**Stub-first convention**: when scaffolding a domain before its logic is ready, ship the full router/schema/service skeleton with every service method body being `raise NotImplementedError("<method> is not implemented yet")`. The global exception handler turns this into `501` automatically, so the frontend can build against the contract before the implementation lands. Most domains in this repo are currently in this state — check `services/<domain>/<domain>_service.py` before assuming a method is real.

## Conventions

- IDs are always `str`, 20-char random alphanumeric from `core/common/ids.generate_id()` — never auto-increment ints.
- snake_case files, PascalCase classes, one class per DAO/service/model file.
- Import sorting and pyupgrade rules are enforced by ruff (`select = ["E", "F", "I", "UP"]`, line length 120) — run `make format` before considering a change done.
- No auth layer exists — don't add `HTTPException(401/403)` checks; access gating in the PRD is a simulated state machine, not real auth.

## Tech stack

Python 3.12, FastAPI, SQLAlchemy 2.0 async + asyncpg, pgvector, Alembic, pydantic v2 / pydantic-settings, `openai` SDK, `uv` as package manager (`uv sync`, `uv run <cmd>`), pytest + pytest-asyncio (`asyncio_mode = "auto"`), ruff for lint/format.

## Commands

```bash
make setup    # env + install + db-up + migrate (first time only)
make dev      # uv run dev — serves :8000, docs at /docs, health at /health
make test     # uv run pytest
make lint     # ruff check + ruff format --check
make format   # ruff format + ruff check --fix
make migrate  # alembic upgrade head
```

## Testing

`tests/conftest.py` provides a `db_session` fixture that opens a session against the **real local Postgres** (no mocking, no sqlite-in-memory) and rolls back afterward. Because `BaseDAO.create/update/delete` call `session.commit()` internally, rollback alone won't undo writes — tests must explicitly clean up rows they create (see `tests/test_repo_service.py`: uses a `uuid4()`-suffixed unique value to avoid collisions, then calls `service.<entity>_dao.delete(created.id)` at the end). Tests instantiate the service directly with the `db_session` fixture rather than going through HTTP — there is no `TestClient`/`httpx.AsyncClient` usage yet, so add one if you need to test the router/middleware layer itself.
