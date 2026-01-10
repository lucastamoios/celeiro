# Development Setup

## Prerequisites

- Go 1.24+
- Node.js 20+
- Docker + Docker Compose

## Quick Start

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

## Commands

| Command | Action |
|---------|--------|
| `make up` | Start all services |
| `make down` | Stop all services |
| `make restart` | Rebuild and restart |
| `make full-restart` | Rebuild without cache |
| `make migrate` | Run migrations |
| `make migrate.rollback` | Rollback last migration |
| `make migrate.reset` | Reset all migrations |
| `make test` | Run tests |
| `make dbshell` | Database shell |
| `make env` | Create .env.dev if missing |
| `make gentypes` | Generate TypeScript types |

## Environment Variables

### Backend (.env.dev)

| Variable | Purpose | Required |
|----------|---------|----------|
| DATABASE_URL | PostgreSQL connection | Yes |
| REDIS_URL | Redis connection | Yes |
| ENVIRONMENT | development/production | Yes |
| FRONTEND_URL | For email links | Production |
| RESEND_API_KEY | Email sending | Production |
| RESEND_WEBHOOK_SECRET | Email webhook auth | Production |
| GOOGLE_CLIENT_ID | Google OAuth | Optional |
| OTEL_ENABLED | OpenTelemetry toggle | Optional |

### Frontend (.env)

| Variable | Purpose |
|----------|---------|
| VITE_API_URL | Backend URL (http://localhost:9090) |

## Verify Backend

```
curl -i http://localhost:9090/accounts/me/
# Expected: 401 Unauthorized (server is reachable)
```

## Local (Non-Docker)

```
make setup
make migrate
cd backend && go run ./cmd/web/main.go
```

## Frontend Only

```
cd frontend
npm install
npm run dev
```
