# Celeiro Documentation Index

Personal finance management system with Go backend and React frontend.

## Quick Reference

| Need to... | Read |
|------------|------|
| Understand system architecture | [architecture.md](./architecture.md) |
| Understand domain entities | [domains.md](./domains.md) |
| Find files for a specific task | [key-files.md](./key-files.md) |
| Know project quirks/conventions | [gotchas.md](./gotchas.md) |
| Fix common issues | [troubleshooting.md](./troubleshooting.md) |
| Understand database schema | [database.md](./database.md) |
| Set up development environment | [setup.md](./setup.md) |
| Deploy to staging/production | [deployment.md](./deployment.md) |

## Project Structure

```
celeiro/
├── backend/           Go API (Chi router, PostgreSQL, Redis)
│   ├── internal/
│   │   ├── application/   # Business logic (services, repos)
│   │   │   ├── accounts/  # Auth domain
│   │   │   └── financial/ # Core financial domain (MOST CODE HERE)
│   │   ├── web/           # HTTP handlers
│   │   └── migrations/    # SQL migrations (Goose)
│   └── pkg/               # Shared packages
├── frontend/          React 19 + Vite + Tailwind
│   └── src/
│       ├── components/    # All UI components
│       ├── api/           # API client
│       └── contexts/      # React contexts (auth)
├── docs/              This documentation
└── openspec/          Change proposals and specs
```

## Development Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 13000 | http://localhost:13000 |
| Backend API | 9090 | http://localhost:9090 |
| PostgreSQL | 54330 | localhost:54330 |
| Redis | 63800 | localhost:63800 |
| Grafana | 13001 | http://localhost:13001 |

## Core Domains

1. **Auth** - Passwordless magic link authentication
2. **Accounts** - Bank accounts (checking, savings, credit)
3. **Transactions** - Financial transactions with OFX import
4. **Categories** - Transaction classification with emoji/color support
5. **Budgets** - Category-centric budgeting (fixed/calculated/maior)
6. **Patterns** - Regex-based automatic transaction matching

## Key Commands

```bash
make up           # Start all services
make down         # Stop all services
make test         # Run tests
make dbshell      # Database shell
make migrate      # Run migrations
make restart      # Rebuild and restart
```

## Critical Rule: Service Boundaries

**Each repository ONLY accesses its own domain table. No cross-domain JOINs.**

See [gotchas.md](./gotchas.md) and `CLAUDE.md` for detailed rules.
