# OwnBoard — Frontend

Next.js 15 (App Router) UI for OwnBoard. Serves on **http://localhost:3000**.

## Prerequisites

- Node.js + npm
- Backend running at http://localhost:8000 (optional — UI still loads with empty/error states)

## Run locally

```bash
cd frontend

# First time only
make setup

# Start Next.js
make dev
```

Or from the **repo root**: `make frontend` (or `make dev` for backend + frontend).

### What `make setup` does

1. Copies `.env.example` → `.env.local` (if missing)
2. `npm install`

### Env file

Copy manually if you prefer:

```bash
cp .env.example .env.local
```

| Variable | Notes |
|----------|--------|
| `BACKEND_API_BASE_URL` | FastAPI base URL (`http://localhost:8000`). Used only in Next.js API routes — not sent to the browser. |
| `NEXT_PUBLIC_APP_NAME` | App display name |

### Manual commands (without Make)

```bash
npm install
cp .env.example .env.local
npm run dev
```

## How requests reach the API

Browser → Next.js `/api/*` routes → FastAPI (`BACKEND_API_BASE_URL` + `/api/v1/*`).

The browser never calls FastAPI directly.

## Other commands

```bash
make lint    # biome check .
make format  # biome format --write .
make build
make start   # production server after build
```
