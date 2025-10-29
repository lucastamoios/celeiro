# Setup Guide

Quick setup instructions for running Celeiro locally.

## Prerequisites

- Go 1.24+
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 16 (via Docker)

## Backend Setup

```bash
cd backend
make setup      # Install dependencies
make db-up      # Start PostgreSQL via Docker
make migrate-up # Run migrations
make run        # Start server (localhost:8080)
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev     # Start dev server (localhost:5173)
```

## Verify Installation

### Check Backend

```bash
curl http://localhost:8080/health
# Should return: {"status":"ok"}
```

### Check Database

```bash
# View container logs
docker logs celeiro-postgres

# Check migration status
make migrate-status
```

## Troubleshooting

### Backend won't start

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# View container logs
docker logs celeiro-postgres

# Reset database
make db-reset
```

### Migrations fail

```bash
# View status
make migrate-status

# Rollback last migration
make migrate-down

# Apply manually
goose -dir migrations postgres "postgres://user:pass@localhost:5432/celeiro" up
```

### Frontend won't load data

1. Check backend is running: `curl localhost:8080/health`
2. Verify API URL in `frontend/.env`
3. Open DevTools Network tab to inspect requests

## Environment Variables

### Backend (.env)

```bash
DB_URL=postgres://user:pass@localhost:5432/celeiro
JWT_SECRET=your-secret-key
PORT=8080
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8080/api/v1
```

See `.env.example` files for complete variable lists.
