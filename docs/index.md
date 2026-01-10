# Celeiro Documentation

Personal finance management system with Go backend, React frontend, PostgreSQL database.

## Quick Reference

| Topic | Document |
|-------|----------|
| System architecture | [architecture.md](./architecture.md) |
| Database schema | [database.md](./database.md) |
| Domain entities | [domains.md](./domains.md) |
| Authentication | [auth.md](./auth.md) |
| Project conventions | [conventions.md](./conventions.md) |
| Key files location | [files.md](./files.md) |
| Development setup | [setup.md](./setup.md) |
| Deployment | [deployment.md](./deployment.md) |
| Troubleshooting | [troubleshooting.md](./troubleshooting.md) |

## Project Structure

```
celeiro/
├── backend/           Go API (Chi router, SQLX, PostgreSQL)
│   └── internal/
│       ├── application/   Business logic (services, repos)
│       │   ├── accounts/  Auth domain
│       │   └── financial/ Core financial domain
│       ├── web/           HTTP handlers
│       └── migrations/    SQL migrations (Goose)
├── frontend/          React 19 + Vite + Tailwind
├── backoffice/        Admin panel (React)
├── docs/              This documentation
└── openspec/          Change proposals
```

## Development Ports

| Service | Port |
|---------|------|
| Frontend | 13000 |
| Backend API | 9090 |
| PostgreSQL | 54330 |
| Redis | 63800 |

## Core Domains

| Domain | Description |
|--------|-------------|
| Auth | Passwordless magic link authentication |
| Accounts | Bank accounts (checking, savings, credit) |
| Transactions | Financial transactions, OFX import |
| Categories | Transaction classification with icons |
| Budgets | Category-centric budgeting |
| Patterns | Regex-based automatic categorization |

## Key Commands

| Command | Action |
|---------|--------|
| `make up` | Start all services |
| `make down` | Stop all services |
| `make test` | Run tests |
| `make dbshell` | Database shell |
| `make migrate` | Run migrations |
| `make restart` | Rebuild and restart |

## Critical Rules

1. **Service Boundaries**: Each repository only accesses its own domain table. No cross-domain JOINs.
2. **Timezone**: Always use `time.Now().UTC()` for timestamps.
3. **Headers**: Financial endpoints require `Authorization` and `X-Active-Organization` headers.

See [conventions.md](./conventions.md) for detailed rules.
