# Onboard — frontend

Next.js 15 (App Router) frontend for Onboard, an onboarding platform that turns a codebase and
its git history into a cited policy quiz, a codebase-readiness quiz, and a commit-grounded
archaeology Q&A, plus a manager dashboard for bus-factor and quiz analytics.

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

The app runs at `http://localhost:3000`. It expects a FastAPI backend at
`BACKEND_API_BASE_URL` (default `http://localhost:8000`), exposing `/api/v1/*`. The UI degrades
gracefully (loading/empty/error states) if the backend isn't running.

## Architecture

Requests flow: **page** (`src/app`) → **component** (`src/components/<feature>`) → **hook**
(`src/hooks/queries/<domain>`, TanStack Query) → **service** (`src/services/<domain>.service.ts`)
→ **API client** (`src/lib/api/api-client.ts`, browser-side axios instance) → **Next proxy route**
(`src/app/api/<domain>/route.ts`) → **backend client** (`src/lib/api/backend-client.ts`,
server-only axios instance) → **FastAPI backend**.

The browser never calls the FastAPI backend directly — every request goes through a Next.js
route handler first. This keeps a clean seam for adding auth/session handling later, and keeps
the backend URL (and any future secret) out of the browser bundle, since it's read from a
non-`NEXT_PUBLIC_` env var only inside route handlers.

- `src/app/` — route segments, one per feature (`onboarding`, `chat`, `dashboard`)
- `src/app/api/*/route.ts` — thin proxy handlers to the FastAPI backend
- `src/components/<feature>/` — UI grouped by feature; `src/components/layout/` for shell/nav
- `src/ui/` — shadcn/ui primitives (`components.json` points its `ui` alias here)
- `src/services/` — client-side calls to the Next proxy routes, response validation via zod
- `src/hooks/queries/<domain>/` — TanStack Query hooks wrapping the services
- `src/schemas/<domain>/` — zod schemas mirroring backend DTOs
- `src/lib/api/` — config, axios client factories, endpoint map, proxy helper
- `src/providers/` — React providers (`QueryProvider`)
- `src/stores/` — zustand stores for client-only UI state (onboarding wizard progress)
- `src/types/`, `src/constants/` — shared types and constants

## What's real vs. stubbed

`repos` is the one fully-wired vertical slice: list/get/create round-trip through the Next proxy
to the backend, with zod validation on the way back. Every other domain (`employees`,
`quiz-templates`, `quiz-attempts`, `chat`, `experts`, `dashboard/*`) has the full routing and
hook surface in place but is a thin pass-through, since those backend endpoints may still be
stubs. The onboarding quiz pages render mock local questions — quiz generation isn't built
server-side yet.
