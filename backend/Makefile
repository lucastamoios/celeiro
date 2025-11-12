# Scaffold Project Makefile
# =====================
#
# This is the main Makefile for the Scaffold project.
# It contains core targets for development, testing, and infrastructure.
#
# Additional targets are organized in separate files:
# - Makefile.cli: CLI command shortcuts and interactive workflows
#
# Common targets:
#   make up           - Start all services with Docker Compose (detached)
#   make down         - Stop all services
#   make restart      - Restart all services (rebuild with cache - fast)
#   make full-restart - Full restart with no cache (slow but ensures fresh build)
#   make test         - Run tests
#   make cli          - Show available CLI commands

.PHONY: up down restart full-restart setup test

# Check if .env.dev exists, fail with helpful message if not
ifeq (,$(wildcard .env.dev))
    $(error Missing .env.dev file! Create it by copying: cp .envrc .env.dev)
endif

# Load environment variables from .env.dev
include .env.dev
export

# Include CLI-related targets
include Makefile.cli

setup:
	@./infra/setup.sh

up: setup
	@echo "🚀 Starting all services with Docker Compose..."
	docker compose -f docker-compose.yml up -d
	@echo "✅ All services started!"
	@echo ""
	@echo "📍 Services available at:"
	@echo "   Frontend:  http://localhost:${FRONTEND_EXTERNAL_PORT}"
	@echo "   Backend:   http://localhost:${BACKEND_EXTERNAL_PORT}"
	@echo "   Postgres:  localhost:${DATABASE_PORT}"
	@echo "   Redis:     localhost:${REDIS_PORT}"
	@echo ""
	@echo "📋 View logs: docker logs -f ${PROJECT_NAME}_backend (or ${PROJECT_NAME}_frontend)"

down:
	@echo "🛑 Stopping all services..."
	docker compose -f docker-compose.yml down --remove-orphans
	@echo "✅ All services stopped!"

restart: setup
	@echo "🔄 Restarting all services..."
	docker compose -f docker-compose.yml down --remove-orphans
	docker compose -f docker-compose.yml up -d --build
	@echo "✅ All services restarted!"
	@echo ""
	@echo "📍 Services available at:"
	@echo "   Frontend:  http://localhost:${FRONTEND_EXTERNAL_PORT}"
	@echo "   Backend:   http://localhost:${BACKEND_EXTERNAL_PORT}"
	@echo ""
	@echo "📋 View logs: docker logs -f ${PROJECT_NAME}_backend (or ${PROJECT_NAME}_frontend)"

full-restart: setup
	@echo "🔥 Full restart (no cache - slower but ensures fresh build)..."
	docker compose -f docker-compose.yml down --remove-orphans
	docker compose -f docker-compose.yml build --no-cache
	docker compose -f docker-compose.yml up -d
	@echo "✅ All services rebuilt from scratch and started!"
	@echo ""
	@echo "📍 Services available at:"
	@echo "   Frontend:  http://localhost:${FRONTEND_EXTERNAL_PORT}"
	@echo "   Backend:   http://localhost:${BACKEND_EXTERNAL_PORT}"
	@echo ""
	@echo "📋 View logs: docker logs -f ${PROJECT_NAME}_backend (or ${PROJECT_NAME}_frontend)"

test:
	gotest -v ./...

dbshell:
	PGPASSWORD=${DATABASE_PASSWORD} psql -h localhost -p ${DATABASE_PORT} -U ${DATABASE_USER} -d ${DATABASE_NAME}

migrate:
	goose -dir ./internal/migrations postgres "${DATABASE_URL}" up

migrate.rollback:
	goose -dir ./internal/migrations postgres "${DATABASE_URL}" down

migrate.reset:
	goose -dir ./internal/migrations postgres "${DATABASE_URL}" reset

gentypes:
	go run ./cmd/tygo/main.go
