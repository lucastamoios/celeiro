# Celeiro Documentation Index

Personal finance management system with Go backend and React frontend.

## Quick Reference

| Need to... | Read |
|------------|------|
| Understand system architecture | [architecture.md](./architecture.md) |
| Find files for a specific task | [key-files.md](./key-files.md) |
| Know project quirks/conventions | [gotchas.md](./gotchas.md) |
| Fix common issues | [troubleshooting.md](./troubleshooting.md) |
| Understand database schema | [database.md](./database.md) |
| Set up development environment | [setup.md](./setup.md) |

## System Overview

```
celeiro/
├── backend/           Go API (Chi router, PostgreSQL, Redis)
├── frontend/          React 19 + Vite + Tailwind
├── docs/              This documentation
├── openspec/          Change proposals and specs
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
4. **Categories** - Transaction classification with emoji support
5. **Budgets** - Category-centric budgeting (fixed/calculated/maior)
6. **Patterns** - Regex-based transaction matching

## Key Commands

```bash
# Start all services
make up

# Stop all services
make down

# Run tests
make test

# Database shell
make dbshell

# Run migrations
make migrate
```

## Planning System

Uses OpenSpec for change proposals:
- `/openspec:proposal` - Create new proposal
- `/openspec:apply` - Implement approved spec
- Active specs in `openspec/changes/`
