.PHONY: help setup setup-backend setup-frontend env install db-up db-down db-reset migrate \
	dev backend frontend test lint clean

BACKEND_DIR  := backend
FRONTEND_DIR := frontend

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

setup: setup-backend setup-frontend ## First-time setup for backend + frontend

setup-backend: ## Env, deps, postgres, migrations
	$(MAKE) -C $(BACKEND_DIR) setup

setup-frontend: ## Env + npm install
	$(MAKE) -C $(FRONTEND_DIR) setup

env: ## Create backend .env and frontend .env.local if missing
	$(MAKE) -C $(BACKEND_DIR) env
	$(MAKE) -C $(FRONTEND_DIR) env

install: ## Install backend (uv) + frontend (npm) deps
	$(MAKE) -C $(BACKEND_DIR) install
	$(MAKE) -C $(FRONTEND_DIR) install

db-up: ## Start Postgres
	$(MAKE) -C $(BACKEND_DIR) db-up

db-down: ## Stop Postgres (keeps data)
	$(MAKE) -C $(BACKEND_DIR) db-down

db-reset: ## Stop Postgres and delete data
	$(MAKE) -C $(BACKEND_DIR) db-reset

migrate: ## Run Alembic migrations
	$(MAKE) -C $(BACKEND_DIR) migrate

backend: ## Run API only (http://localhost:8000)
	$(MAKE) -C $(BACKEND_DIR) dev

frontend: ## Run Next.js only (http://localhost:3000)
	$(MAKE) -C $(FRONTEND_DIR) dev

dev: ## Run backend + frontend together
	@echo "Starting backend (:8000) and frontend (:3000)..."
	@trap 'kill 0' EXIT; \
		$(MAKE) -C $(BACKEND_DIR) dev & \
		$(MAKE) -C $(FRONTEND_DIR) dev & \
		wait

test: ## Run backend tests
	$(MAKE) -C $(BACKEND_DIR) test

lint: ## Lint backend + frontend
	$(MAKE) -C $(BACKEND_DIR) lint
	$(MAKE) -C $(FRONTEND_DIR) lint

clean: ## Clean caches in both apps
	$(MAKE) -C $(BACKEND_DIR) clean
	$(MAKE) -C $(FRONTEND_DIR) clean
