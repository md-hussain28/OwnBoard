# OwnBoard — Backend

FastAPI API for OwnBoard. Serves on **http://localhost:8000**.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python 3.12+)
- Homebrew [PostgreSQL](https://formulae.brew.sh/formula/postgresql@18) + [pgvector](https://github.com/pgvector/pgvector#installation)

Expected local DB: `postgresql://onboard:onboard@localhost:5432/onboard` (role + database named `onboard`, with `CREATE EXTENSION vector`).

## Run locally

```bash
cd backend

# First time only
make setup

# Start the API
make dev
```

- Docs: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

Or from the **repo root**: `make backend` (or `make dev` for backend + frontend).

### What `make setup` does

1. Copies `.env.example` → `.env` (if missing)
2. `uv sync` — install Python deps
3. Checks local Postgres on port **5432** (`make db-up`)
4. `alembic upgrade head` — run migrations

### Env file

Copy manually if you prefer:

```bash
cp .env.example .env
```

| Variable | Notes |
|----------|--------|
| `ENVIRONMENT` | `local` (default) or `prod` / `production` |
| `DATABASE_URL_LOCAL` | Local Homebrew Postgres; used when `ENVIRONMENT=local` |
| `DATABASE_URL_PROD` | Neon (or other cloud); used when `ENVIRONMENT=prod` |
| `API_PORT` | `8000` |
| `CORS_ALLOWED_ORIGINS` | Include `http://localhost:3000` for the frontend |
| `OPENAI_API_KEY` | Optional for basic CRUD; needed for LLM features later |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Doc pack file storage |

### Manual commands (without Make)

```bash
uv sync
cp .env.example .env
# ensure brew postgres is running: brew services start postgresql@18
uv run alembic upgrade head
uv run dev
```

Optional Docker Postgres (conflicts with Brew if both use `:5432`): `make db-docker-up` / `make db-docker-down`. Prefer one or the other — not both.

## Tests & lint

```bash
make test
make lint
make format
```

## Architecture (quick map)

`api/routes` → `api/schema` → `services` → `dao` → `core/database`

See comments in those packages for domain details. Wired today: **repo** and **employee** CRUD. Other domains return `501` until implemented.
