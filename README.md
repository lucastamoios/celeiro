# Celeiro - Personal Finance Management System

> A personal finance management system with OFX import, automatic classification, and flexible budgets.

## Overview

**Problem**: Managing personal finances is tedious — multiple accounts, manual classification, no budget control.

**Solution**: Import OFX → Classify automatically → Control budgets by category.

## Documentation

- **[product.md](./product.md)** - Product vision, features, and business decisions
- **[docs/index.md](./docs/index.md)** - Documentation index and quick reference
- **[docs/setup.md](./docs/setup.md)** - Installation and setup guide
- **[docs/architecture.md](./docs/architecture.md)** - System architecture and design patterns
- **[docs/database.md](./docs/database.md)** - Complete data model (auth + financial)
- **[docs/domains.md](./docs/domains.md)** - Domains and entities guide
- **[docs/conventions.md](./docs/conventions.md)** - Code conventions and patterns
- **[docs/auth.md](./docs/auth.md)** - Authentication system
- **[docs/troubleshooting.md](./docs/troubleshooting.md)** - Troubleshooting

## Project Structure

```
celeiro/
├── backend/              # Go API + PostgreSQL
│   ├── cmd/             # Entry points
│   ├── internal/        # Private application code
│   │   ├── domain/      # Entities and interfaces
│   │   ├── repository/  # Data access
│   │   ├── service/     # Business logic
│   │   └── web/         # HTTP handlers
│   ├── migrations/      # SQL migrations (Goose)
│   └── pkg/             # Reusable code
│       └── ofx/         # OFX parser
├── frontend/            # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Application pages
│   │   ├── services/    # API clients
│   │   └── types/       # TypeScript types
│   └── public/
├── docs/                # Documentation
└── openspec/            # OpenSpec specifications (changes in openspec/changes/)
```

## Quick Start

Recommended flow (Docker):

```bash
make up
```

Access http://localhost:13000

See **[docs/setup.md](./docs/setup.md)** for the full guide.

## Architecture

**Backend:** Repository → Service → Handler (Go + PostgreSQL + SQLX)
**Frontend:** React + TypeScript + Tailwind CSS
**DevOps:** Docker + GitHub Actions

See **[docs/architecture.md](./docs/architecture.md)** for full details.

## Data Model

```
users → accounts → transactions → categories → budgets → budget_items
                                             ↘ classification_rules
```

**Key decisions:**
- Serial IDs (not UUID) for performance
- Unique FITID per account prevents duplicates
- Budget with 3 types: fixed, calculated, hybrid
- Raw OFX stored in JSONB for auditing

See **[docs/database.md](./docs/database.md)** for the full schema.

## Development

**Workflow:** OpenSpec (proposal/change) → Implementation → Review

```bash
# Main commands
make test                         # Run backend tests
npm test                          # Run frontend tests
```

See **[docs/conventions.md](./docs/conventions.md)** for conventions.

## Tests

```bash
# Backend
make test           # Unit + Integration tests
make test-coverage  # Coverage report (target: >80%)

# Frontend
npm test            # Jest + React Testing Library
npm test -- --coverage
```

See **[backend/STARTUP-GUIDE.md](./backend/STARTUP-GUIDE.md)** for the backend guide.

## Tech Stack

**Backend:** Go 1.24, Chi, PostgreSQL 16, Redis, SQLX, Goose
**Frontend:** React 18, TypeScript, Tailwind CSS, Vite
**Auth:** Passwordless (magic codes via email)
**DevOps:** Docker, GitHub Actions
**AI Tools:** OpenSpec, Claude Code

See **[docs/conventions.md](./docs/conventions.md)** for code conventions.
See **[docs/auth.md](./docs/auth.md)** for the auth system.

## Troubleshooting

```bash
# Backend won't start
docker ps | grep postgres  # Check PostgreSQL
docker logs celeiro-postgres
make down
docker volume prune  # Careful: removes all unused volumes
make up

# Migrations fail
make migrate.rollback

# Frontend has no data
curl -i localhost:9090/accounts/me/  # Test backend
cat frontend/.env  # Check VITE_API_URL
```

See **[docs/setup.md#troubleshooting](./docs/setup.md#troubleshooting)** for more solutions.

## Contributing

1. Create a specification in OpenSpec
2. Implement following [docs/conventions.md](./docs/conventions.md)
3. Ensure tests pass
4. Create a PR with a clear description

## License

Proprietary - Lucas Tamoios
