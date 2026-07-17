# Frontend — CLAUDE.md

Next.js 15 (App Router) + React 19 UI for OwnBoard. Repo-level context: [`../CLAUDE.md`](../CLAUDE.md). Visual/UX consistency rules: [`DESIGN.md`](DESIGN.md) — read it before touching any component, page, or `ui/` primitive.

## The browser never calls FastAPI directly

`Browser → app/api/**/route.ts → FastAPI`. Every route handler under `src/app/api/` is a thin proxy: it just calls `proxyRequest(method, path, options)` (`src/lib/api/proxy.ts`), which forwards to the backend and maps axios errors to `NextResponse.json` (503 when the backend is unreachable). No business logic belongs in a route handler. Adding a new backend endpoint means adding a matching route handler here before any client code can reach it.

Two separate axios instances exist — don't mix them up:
- `src/lib/api/api-client.ts` — browser-facing, `baseURL: "/api"`, used by `services/*.service.ts`.
- `src/lib/api/backend-client.ts` — server-only (imports `"server-only"`), `baseURL: ${BACKEND_API_BASE_URL}/api/v1`, used only inside route handlers via `proxyRequest`.

## Layering pattern (same shape for every domain: repo, employee, quiz, chat, dashboard, expert)

```
schemas/<domain>.schema.ts   zod schema + z.infer<> exported type — the type source of truth
        ↓
services/<domain>.service.ts   axios call via api-client + API_ENDPOINTS, .parse() the response
        ↓
hooks/queries/<domain>/*.queries.ts | *.mutations.ts   TanStack Query wrapper + a `<domain>Keys` key factory
        ↓
components/<domain>/*.tsx   feature component, consumed by app/**/page.tsx
```

When adding a new domain or field: define/extend the zod schema first, then the service function, then the query/mutation hook, then the component. Don't call axios or `fetch` directly from a component.

Note: `repo.schema.ts` shows the pattern for backend fields that may arrive as either camelCase or snake_case (e.g. `ingestedAt`/`ingested_at`) — accept both and `.transform()` to one camelCase field. Apply this when a schema wraps a new backend response.

## Directory map

- `src/app/` — routes (App Router) + `api/**/route.ts` proxy handlers. Server components by default; add `"use client"` only where hooks/state are used (every page under `onboarding/`, `chat/`, `dashboard/` is a client component already).
- `src/components/<domain>/` — composed, feature-aware components (kebab-case filename, PascalCase named export, no default exports).
- `src/ui/` — shadcn/ui **primitives only** (button, card, dialog, input, etc.). This is a separate folder from `components/` (see `components.json` aliases: `"ui": "@/ui"`, `"components": "@/components"`) — don't put generated shadcn primitives under `components/ui`, and don't put feature logic in `src/ui/`.
- `src/schemas/` — one file per domain, zod schemas + inferred types.
- `src/services/` — thin async functions, one per domain.
- `src/hooks/queries/<domain>/` — TanStack Query hooks, split into `*.queries.ts` (GET) and `*.mutations.ts` (POST/PUT/DELETE).
- `src/stores/` — zustand stores, plain `create<T>()`, no middleware. Currently just `onboarding-store.ts` for wizard step/result state — use zustand only for state that must survive across route navigations; prefer local `useState` or TanStack Query cache otherwise.
- `src/providers/query-provider.tsx` — `QueryClientProvider` + devtools, mounted in `app/layout.tsx`.
- `src/lib/api/` — `api-client.ts`, `backend-client.ts`, `config.ts` (zod-validated env vars), `endpoint.ts` (`API_ENDPOINTS` path builders), `proxy.ts`.
- `src/lib/utils.ts` — `cn()` (`twMerge(clsx(...))`), the shadcn convention — use it instead of manual className concatenation.
- `src/constants/app.ts` — app-wide constants (e.g. `DEMO_REPO_ID`).

## Conventions

- Filenames: kebab-case. Components: PascalCase named exports (no default export except `app/**/page.tsx`).
- Forms are plain controlled `useState` + native `<form onSubmit>` — there is no react-hook-form in this project; don't introduce it for a single form.
- Loading/error/empty is a repeated 3-state pattern in every data-driven component: `isLoading` → `<Skeleton>`, `isError` → muted-foreground fallback text, empty array → a short "No X yet." message. Prefer [`components/shared/query-state.tsx`](src/components/shared/query-state.tsx) when wiring a new list. Match this instead of inventing a new pattern.
- Query key factories: export a `<domain>Keys` object next to each domain's query hooks (see `dashboardKeys`, `quizKeys`) rather than inlining key arrays at call sites.
- Optimistic mutations: for list delete/update/revoke/ack, use [`hooks/queries/optimistic.ts`](src/hooks/queries/optimistic.ts) (`optimisticUpdate` + `rollbackOptimistic`) with `onMutate` / `onError` / `onSettled` invalidate. Skip optimistic UI for async server jobs (generate quiz, upload, chat).
- Shared list chrome: [`FilterSelect`](src/components/shared/filter-select.tsx), [`AssignmentRoster`](src/components/shared/assignment-roster.tsx), assignment status helpers in [`assignment-status.ts`](src/components/shared/assignment-status.ts).
- Icons: `lucide-react` only.

## Package manager

Both `bun.lock` and `package-lock.json` exist, but `README.md`/`Makefile`/root `Makefile` all document **npm** (`npm install`, `npm run dev`). Use `npm` unless the user explicitly tells you the project has switched to bun — don't let a stray `bun.lock` update change which lockfile you commit.

## Commands

```bash
make setup   # copy .env.local + npm install
make dev     # npm run dev — :3000
make build   # npm run build
make lint    # biome check .
make format  # biome format --write .
npm run check       # biome check --write . (lint + format + safe fixes)
npm run storybook   # component workbench — :6006, no backend needed
```

Lint/format is **Biome** (`biome.json`) — not ESLint. Prefer fixing via `npm run check` before committing.

## Storybook

`npm run storybook` (port 6006) renders every UI primitive and feature component without the backend or Clerk. Config lives in `.storybook/`; `*.stories.tsx` files sit next to their components. Data-driven components work because MSW (`.storybook/mocks/handlers.ts`) intercepts the axios calls to `/api/*` with mock payloads shaped like the real wire format (`.storybook/mocks/data.ts` — snake_case where the zod schema `.transform()`s, camelCase otherwise). Story-level `parameters.msw.handlers` overrides show loading / error / 501-"Incoming" states; `notImplemented()` and `loadingForever()` helpers cover the common cases — note these **replace** the global handlers, so spread `...handlers` after your overrides (MSW matches first-wins). When a backend response shape changes, update the matching mock in `.storybook/mocks/data.ts` alongside the zod schema.

Clerk is aliased to a signed-in mock (`.storybook/mocks/clerk.tsx`, wired via `viteFinal` in `.storybook/main.ts`), so the real console shell (`app-shell`, sidebar, account footer) renders in stories; extend the mock if a component starts using a new `@clerk/nextjs` API. Screen-level stories live in `src/screens/*.stories.tsx` (`Screens/*` in the sidebar): they render the real `app/(console)/**/page.tsx` route components wrapped in the shell via the `withAppShell` decorator (`src/screens/story-shell.tsx`), set `parameters.nextjs.navigation.pathname` so the matching nav item highlights, and use play functions for multi-step flows (e.g. chat ask → cited answer). Pages that take a `params` promise need a module-level `Promise.resolve({...})` (stable across renders) inside a `<Suspense>` boundary.

## Tech stack

Next.js 15 / React 19 / TypeScript, Tailwind CSS v4 (CSS-first config, no `tailwind.config.*` — see `src/app/globals.css` and [`DESIGN.md`](DESIGN.md)), shadcn/ui (`radix-nova` style preset, `neutral` base color) + `radix-ui` + `class-variance-authority`, zustand, TanStack Query v5 + axios, zod v4, `lucide-react` icons.
