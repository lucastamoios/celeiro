# Celeiro Documentation

Personal finance management system with Go backend, React frontend, PostgreSQL database.

## AI Quick Reference

**Critical rules to always follow:**

| Rule | Details |
|------|---------|
| Service boundaries | Repositories access ONE table only. Use service composition for cross-domain data. |
| Timezone | Always `time.Now().UTC()` for database timestamps |
| Required headers | `/financial/*` routes need `Authorization` + `X-Active-Organization` |
| Pattern matching | Use `original_description` (immutable), not `description` (user-editable) |
| Budgets | Use `category_budgets` table (NOT legacy `budgets` table) |

**Common patterns:**

| Task | How to |
|------|--------|
| Add endpoint | router.go → handler → service → repository |
| Add table | migrations/ → models.go → dto.go → repository |
| Cross-domain query | Call services sequentially, compose in handler |
| Test locally | `make up` then `make migrate` |

**Key file locations:**

| What | Where |
|------|-------|
| Routes | `backend/internal/web/router.go` |
| Business logic | `backend/internal/application/{domain}/service.go` |
| Data access | `backend/internal/application/{domain}/repository.go` |
| React pages | `frontend/src/components/` |
| API clients | `frontend/src/api/` |

## Documentation Index

| Topic | Document |
|-------|----------|
| System architecture | [architecture.md](./architecture.md) |
| Database schema | [database.md](./database.md) |
| Domain entities | [domains.md](./domains.md) |
| Authentication | [auth.md](./auth.md) |
| **Frontend screens** | [screens/index.md](./screens/index.md) |
| Project conventions | [conventions.md](./conventions.md) |
| Key files location | [files.md](./files.md) |
| Feature specs | [specs/budget-planned-entries/spec.md](./specs/budget-planned-entries/spec.md) |
| Budget pacing | [budget-pacing.md](./budget-pacing.md) |
| Planned entry drag & drop | [planned-entry-organization.md](./planned-entry-organization.md) |
| Development setup | [setup.md](./setup.md) |
| Deployment | [deployment.md](./deployment.md) |
| Troubleshooting | [troubleshooting.md](./troubleshooting.md) |

## Project Structure

```
celeiro/
├── backend/           Go API (Chi router, SQLX, PostgreSQL)
│   └── internal/
│       ├── application/   Business logic (services, repos)
│       │   ├── accounts/  Auth, users, organizations
│       │   └── financial/ All financial features
│       ├── web/           HTTP handlers, middlewares
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
| Auth | Magic link, password, Google OAuth authentication |
| Organizations | Multi-tenant user groups with invitations |
| Accounts | Bank accounts (checking, savings, credit, investment) |
| Transactions | Financial transactions, OFX import |
| Categories | Transaction classification with icons/colors |
| Category Budgets | Monthly budgets per category (fixed/calculated/maior) |
| Planned Entries | Expected expenses/income with monthly tracking |
| Advanced Patterns | Regex-based automatic categorization |
| Savings Goals | Long-term savings targets (reserva/investimento) |
| Tags | User-defined transaction labels |

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
4. **Pattern Matching**: Use `original_description` (immutable) not `description` (user-editable).

See [conventions.md](./conventions.md) for detailed rules.
