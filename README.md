# OwnBoard

Hackathon onboarding platform: FastAPI backend + Next.js frontend.

| App | Path | Local URL |
|-----|------|-----------|
| Backend API | [`backend/`](./backend) | http://localhost:8000 |
| Frontend | [`frontend/`](./frontend) | http://localhost:3000 |

## Run everything locally

**Prerequisites:** Homebrew [PostgreSQL](https://formulae.brew.sh/formula/postgresql@18) + [pgvector](https://github.com/pgvector/pgvector#installation), [uv](https://docs.astral.sh/uv/) (Python 3.12+), Node.js + npm

Local DB URL (matches `backend/.env`): `postgresql://onboard:onboard@localhost:5432/onboard`. Do not also run a Docker Postgres on port 5432.

```bash
# 1. First-time setup (env files, deps, Postgres, migrations)
make setup

# 2. Start backend + frontend together
make dev
```

- UI: http://localhost:3000  
- API docs: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

Stop with `Ctrl+C`.

### Env files

| File | Created from |
|------|----------------|
| `backend/.env` | `backend/.env.example` |
| `frontend/.env.local` | `frontend/.env.example` |

`make setup` / `make env` copies these for you if missing. Fill `OPENAI_API_KEY` in `backend/.env` only when you need LLM features.

### Useful make targets

```bash
make help       # list all targets
make backend    # API only (:8000)
make frontend   # Next.js only (:3000)
make db-up      # verify local Homebrew Postgres is ready
make migrate    # run Alembic migrations
```

Optional Docker Postgres (only if you are not using Brew on :5432): `make -C backend db-docker-up` / `db-docker-down`.

More detail: [backend/README.md](./backend/README.md) · [frontend/README.md](./frontend/README.md)
