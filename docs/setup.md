# Setup Guide

Quick setup instructions for running Celeiro locally.

## Prerequisites

- Go 1.24+
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 16 (via Docker)

## Recommended: Docker (Full Stack)

This is the main dev workflow for this repo (backend + frontend + Postgres + Redis + Grafana).

```bash
make up
```

Services:
- Frontend: http://localhost:13000
- Backend API: http://localhost:9090
- Postgres: localhost:54330
- Redis: localhost:63800

### Verify Backend is Running

There is currently no `/health` endpoint. A quick “is the server up?” check is:

```bash
curl -i http://localhost:9090/accounts/me/
# Expect: HTTP/1.1 401 Unauthorized (this is OK; it means the server is reachable)
```

## Optional: Local (Non-Docker) Development

If you want to run pieces locally, make sure your environment variables match `backend/.envrc`.

```bash
make setup
make migrate
cd backend && go run ./cmd/web/main.go
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting

### Backend won't start

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# View container logs
docker logs celeiro-postgres

# Reset database (nukes containers/volumes)
make down
docker volume prune  # Careful: removes all unused volumes
make up
```

### Migrations fail

```bash
# Rollback last migration
make migrate.rollback

# Apply manually
cd backend
goose -dir ./internal/migrations postgres "$DATABASE_URL" up
```

### Frontend won't load data

1. Check backend is running: `curl -i localhost:9090/accounts/me/`
2. Verify API URL in `frontend/.env`
3. Open DevTools Network tab to inspect requests

## Environment Variables

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:9090
```

In Docker production, the frontend is typically reverse-proxied to the backend, so this may differ.
