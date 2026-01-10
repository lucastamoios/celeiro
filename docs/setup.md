# Development Setup

## Prerequisites

- Go 1.24+
- Node.js 20+
- Docker + Docker Compose

## Quick Start

Start all services with Docker:

```
make up
```

## Services

| Service | URL/Port |
|---------|----------|
| Frontend | http://localhost:13000 |
| Backend API | http://localhost:9090 |
| PostgreSQL | localhost:54330 |
| Redis | localhost:63800 |

## Verify Backend

```
curl -i http://localhost:9090/accounts/me/
# Expected: 401 Unauthorized (server is reachable)
```

## Commands

| Command | Action |
|---------|--------|
| `make up` | Start all services |
| `make down` | Stop all services |
| `make restart` | Rebuild and restart |
| `make migrate` | Run database migrations |
| `make test` | Run tests |
| `make dbshell` | Database shell |
| `make env` | Create .env.dev if missing |

## Local (Non-Docker) Development

```
make setup
make migrate
cd backend && go run ./cmd/web/main.go
```

## Frontend Setup

```
cd frontend
npm install
npm run dev
```

## Environment Files

| File | Purpose |
|------|---------|
| backend/.env.dev | Backend configuration |
| frontend/.env | Frontend configuration (VITE_API_URL=http://localhost:9090) |
