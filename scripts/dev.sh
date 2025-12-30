#!/bin/bash
# Development environment with hot reload
# Runs: Postgres + Redis (Docker) | Backend (Air) | Frontend (Vite)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down dev environment...${NC}"

    # Kill backend (Air)
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${BLUE}Stopping backend...${NC}"
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi

    # Kill frontend (Vite)
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${BLUE}Stopping frontend...${NC}"
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi

    echo -e "${GREEN}Dev environment stopped.${NC}"
    echo -e "${YELLOW}Note: Postgres and Redis are still running in Docker.${NC}"
    echo -e "${YELLOW}Run 'make down' to stop them.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check dependencies
check_deps() {
    echo -e "${BLUE}Checking dependencies...${NC}"

    if ! command -v air &> /dev/null; then
        echo -e "${YELLOW}Air not found. Installing...${NC}"
        go install github.com/air-verse/air@latest
    fi

    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js not found. Please install it.${NC}"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker not found. Please install it.${NC}"
        exit 1
    fi
}

# Load environment
load_env() {
    if [ -f "$BACKEND_DIR/.env.dev" ]; then
        echo -e "${BLUE}Loading environment from .env.dev...${NC}"
        set -a
        source "$BACKEND_DIR/.env.dev"
        set +a
    else
        echo -e "${RED}Missing $BACKEND_DIR/.env.dev${NC}"
        echo "Create it by running: cp $BACKEND_DIR/.envrc $BACKEND_DIR/.env.dev"
        exit 1
    fi
}

# Start infrastructure (Postgres + Redis only)
start_infra() {
    echo -e "${BLUE}Starting infrastructure (Postgres + Redis)...${NC}"

    cd "$BACKEND_DIR"

    # Stop all containers first
    docker compose down --remove-orphans 2>/dev/null || true

    # Start only postgres and redis
    docker compose up -d postgres redis

    # Wait for postgres to be ready
    echo -e "${YELLOW}Waiting for Postgres to be ready...${NC}"
    until docker compose exec -T postgres pg_isready -U "$DATABASE_USER" -d "$DATABASE_NAME" > /dev/null 2>&1; do
        sleep 1
    done
    echo -e "${GREEN}Postgres is ready!${NC}"

    cd "$ROOT_DIR"
}

# Start backend with Air
start_backend() {
    echo -e "${BLUE}Starting backend with Air (hot reload)...${NC}"
    cd "$BACKEND_DIR"

    # Run Air in background, prefixing output
    air -c .air.toml 2>&1 | sed 's/^/[backend] /' &
    BACKEND_PID=$!

    cd "$ROOT_DIR"
}

# Start frontend with Vite
start_frontend() {
    echo -e "${BLUE}Starting frontend with Vite (HMR)...${NC}"
    cd "$FRONTEND_DIR"

    # Install deps if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        npm install
    fi

    # Run Vite in background, prefixing output
    npm run dev 2>&1 | sed 's/^/[frontend] /' &
    FRONTEND_PID=$!

    cd "$ROOT_DIR"
}

# Main
main() {
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}   Celeiro Development Environment  ${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo ""

    check_deps
    load_env
    start_infra

    echo ""
    start_backend
    sleep 2  # Give backend a moment to start
    start_frontend

    echo ""
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}   Dev environment is running!      ${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo ""
    echo -e "  ${BLUE}Frontend:${NC}  http://localhost:51111"
    echo -e "  ${BLUE}Backend:${NC}   http://localhost:${PORT:-9090}"
    echo -e "  ${BLUE}Postgres:${NC}  localhost:${DATABASE_PORT}"
    echo -e "  ${BLUE}Redis:${NC}     localhost:${REDIS_PORT}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""

    # Wait for processes
    wait
}

main "$@"
