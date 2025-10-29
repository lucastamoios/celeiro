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
#   make up       - Start all services with Docker Compose
#   make down     - Stop all services
#   make run      - Start the development server with air
#   make test     - Run tests
#   make cli      - Show available CLI commands

.PHONY: up down run setup test

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
	@echo "Starting services with environment from .env.dev..."
	docker compose -f docker-compose.yml up

down:
	@echo "Stopping services..."
	docker compose -f docker-compose.yml down --remove-orphans

# Set SERVICE_VERSION to the first 6 characters of the current git commit hash
run:
	$(eval export SERVICE_VERSION=$(shell git rev-parse --short=6 HEAD))
	air

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