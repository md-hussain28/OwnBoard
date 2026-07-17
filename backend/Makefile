.PHONY: help setup env install db-up db-down db-reset db-docker-up db-docker-down migrate migrate-down dev test lint format clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

setup: env install db-up migrate ## First-time setup: env, deps, local postgres check, migrations

env: ## Create .env from .env.example if missing
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example"; else echo ".env already exists"; fi

install: ## Install Python deps with uv
	uv sync

db-up: ## Verify local Homebrew Postgres is reachable (does not start Docker)
	@pg_isready -h localhost -p 5432 -d onboard >/dev/null 2>&1 \
		|| (echo "Local Postgres not ready on localhost:5432 (db=onboard)."; \
		    echo "Start it with: brew services start postgresql@18"; \
		    echo "Ensure role/db exist: createuser/createdb onboard, then CREATE EXTENSION vector;"; \
		    exit 1)
	@echo "Local Postgres is ready (localhost:5432/onboard)"

db-down: ## No-op for local Brew Postgres (manage with brew services stop postgresql@18)
	@echo "Using local Postgres — stop it yourself if needed: brew services stop postgresql@18"

db-reset: ## Drop and recreate the local onboard database (destructive)
	@psql "postgresql://onboard:onboard@localhost:5432/postgres" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'onboard' AND pid <> pg_backend_pid();" >/dev/null
	@psql "postgresql://onboard:onboard@localhost:5432/postgres" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS onboard;"
	@psql "postgresql://onboard:onboard@localhost:5432/postgres" -v ON_ERROR_STOP=1 -c "CREATE DATABASE onboard OWNER onboard;"
	@psql "postgresql://onboard:onboard@localhost:5432/onboard" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"
	@echo "Recreated local database onboard — run: make migrate"

db-docker-up: ## Optional: start Postgres via Docker Compose (conflicts with Brew on :5432)
	docker compose up -d

db-docker-down: ## Optional: stop Docker Compose Postgres
	docker compose down

migrate: ## Run Alembic migrations
	uv run alembic upgrade head

migrate-down: ## Roll back one Alembic migration
	uv run alembic downgrade -1

dev: ## Run API on http://localhost:8000
	uv run dev

test: ## Run pytest
	uv run pytest

lint: ## Ruff check + format check
	uv run ruff check .
	uv run ruff format --check .

format: ## Auto-format with Ruff
	uv run ruff format .
	uv run ruff check --fix .

clean: ## Remove caches
	rm -rf .pytest_cache .ruff_cache __pycache__
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
