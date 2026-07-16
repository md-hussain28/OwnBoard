.PHONY: help setup env install db-up db-down db-reset migrate migrate-down dev test lint format clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

setup: env install db-up migrate ## First-time setup: env, deps, postgres, migrations

env: ## Create .env from .env.example if missing
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example"; else echo ".env already exists"; fi

install: ## Install Python deps with uv
	uv sync

db-up: ## Start Postgres (pgvector) via Docker
	docker compose up -d

db-down: ## Stop Postgres (keeps data)
	docker compose down

db-reset: ## Stop Postgres and delete data volume
	docker compose down -v

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
