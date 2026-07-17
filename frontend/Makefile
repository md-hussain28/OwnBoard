.PHONY: help setup env install dev build start lint format clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

setup: env install ## First-time setup: env + npm install

env: ## Create .env.local from .env.example if missing
	@if [ ! -f .env.local ]; then cp .env.example .env.local && echo "Created .env.local from .env.example"; else echo ".env.local already exists"; fi

install: ## Install npm dependencies
	npm install

dev: ## Run Next.js on http://localhost:3000
	npm run dev

build: ## Production build
	npm run build

start: ## Start production server (after build)
	npm run start

lint: ## Run Biome check
	npm run lint

format: ## Format with Biome
	npm run format

clean: ## Remove Next.js build/cache
	rm -rf .next node_modules
