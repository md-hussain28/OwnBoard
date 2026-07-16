# Onboard Backend

FastAPI backend for Onboard: turns company docs into cited onboarding quizzes, turns git history into a
readiness quiz that gates repo access, and infers a skill graph to detect bus-factor risk and route new
hires to experts.

## Setup

```bash
uv sync
cp .env.example .env
docker compose up -d
uv run alembic upgrade head
uv run dev
```

The API serves on `http://localhost:8000`. Docs at `/docs`, health check at `/health`.

Note: `docker compose down -v` deletes the Postgres volume (and all data) — use plain `docker compose down`
to stop the container without losing data.

## Architecture

Requests flow `api/routes` -> `api/schema` -> `services` -> `dao` -> `core/database`:

- `api/routes/*_router.py` are thin FastAPI routers, one per domain, that translate HTTP <-> service calls.
- `api/schema/<domain>/{request,response}.py` hold the Pydantic DTOs for that domain, kept separate from
  the ORM models so the HTTP contract can stay stable while the DB schema evolves.
- `api/dependency/service_container.py` is a DI container that lazily builds each domain service off a
  single request-scoped `AsyncSession`.
- `services/<domain>/` holds business logic. This is where the deterministic (LLM-free) skill-graph /
  bus-factor pipeline and the LLM-backed RAG / quiz / archaeology / expert-routing logic will live.
- `dao/models/*.py` are the SQLAlchemy 2.0 ORM models; `dao/<entity>_dao.py` are repository classes
  (async CRUD) extending `dao/base_dao.py`.
- `core/database/postgres.py` owns the async engine/session factory and the pgvector extension bootstrap.
  `core/llm/llm_client.py` is a thin OpenAI SDK wrapper. `core/common/` has logging, the exception
  hierarchy, and the id generator.
- `config/settings.py` is a `pydantic-settings` singleton (`get_settings()`) loaded from `.env`.

When adding a new feature: add/extend the DAO, implement the service method (services already exist as
skeletons for every domain), wire it into the router that's already defined, and add/extend the schema DTOs.

## What's real vs. stubbed

Fully implemented end-to-end: `repo` registration/list/get and `employee` registration/list/get
(router -> service -> DAO -> Postgres).

Everything else (`skill_graph`, `rag`, `quiz`, `archaeology`/chat, `expert_routing`, `dashboard`) has real
routes, real request/response schemas, and a real service class wired through the DI container — but the
service methods raise `NotImplementedError`, which the global exception handler turns into a clean `501`
JSON response. This proves the full architecture end-to-end without faking feature logic ahead of time.

## Tests

```bash
uv run pytest
```

One smoke test lives in `tests/` exercising the repo DAO/service CRUD against the real DB configured via
`DATABASE_URL`. It's a placeholder establishing the pattern — the skill-graph scoring algorithm should get
proper fixture-based unit tests once it's implemented (see PRD §9).

## Lint

```bash
uv run ruff check .
uv run ruff format .
```
