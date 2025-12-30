.PHONY: help env up down restart full-restart logs dbshell migrate migrate.rollback migrate.reset test gentypes dev

BACKEND_DIR := backend
BACKEND_ENV := $(BACKEND_DIR)/.env.dev
BACKEND_ENV_TEMPLATE := $(BACKEND_DIR)/.envrc

help:
	@echo "Celeiro (repo root) commands:"
	@echo "  make dev            Start dev environment with hot reload (recommended)"
	@echo "  make up             Start all services (docker compose)"
	@echo "  make down           Stop all services"
	@echo "  make restart        Restart all services (rebuild)"
	@echo "  make dbshell        Open psql connected to the dev DB"
	@echo "  make migrate        Run migrations"
	@echo "  make test           Run backend tests"
	@echo ""
	@echo "Notes:"
	@echo "  - 'make dev' runs backend (Air) + frontend (Vite) locally with hot reload"
	@echo "  - This Makefile proxies to 'backend/Makefile'."
	@echo "  - It auto-creates backend/.env.dev from backend/.envrc when missing."

env:
	@if [ ! -f "$(BACKEND_ENV)" ]; then \
		echo "Creating $(BACKEND_ENV) from $(BACKEND_ENV_TEMPLATE)"; \
		cp "$(BACKEND_ENV_TEMPLATE)" "$(BACKEND_ENV)"; \
	else \
		echo "$(BACKEND_ENV) already exists"; \
	fi

up: env
	@$(MAKE) -C $(BACKEND_DIR) up

down:
	@$(MAKE) -C $(BACKEND_DIR) down

restart: env
	@$(MAKE) -C $(BACKEND_DIR) restart

full-restart: env
	@$(MAKE) -C $(BACKEND_DIR) full-restart

logs:
	@echo "Backend:  docker logs -f celeiro_backend"
	@echo "Frontend: docker logs -f celeiro_frontend"
	@echo "Postgres: docker logs -f celeiro_postgres"
	@echo "Redis:    docker logs -f celeiro_redis"

dbshell: env
	@$(MAKE) -C $(BACKEND_DIR) dbshell

migrate: env
	@$(MAKE) -C $(BACKEND_DIR) migrate

migrate.rollback: env
	@$(MAKE) -C $(BACKEND_DIR) migrate.rollback

migrate.reset: env
	@$(MAKE) -C $(BACKEND_DIR) migrate.reset

test: env
	@$(MAKE) -C $(BACKEND_DIR) test

gentypes: env
	@$(MAKE) -C $(BACKEND_DIR) gentypes

dev: env
	@./scripts/dev.sh

