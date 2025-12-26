# System Architecture

Celeiro is a personal finance management system with category-centric budgeting.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.24, Chi router, SQLX |
| Frontend | React 19, Vite, Tailwind CSS |
| Database | PostgreSQL 16 |
| Cache/Sessions | Redis 7 |
| Observability | Grafana, Loki, OpenTelemetry |

## System Layers

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│          React + Vite + Tailwind                │
└───────────────────┬─────────────────────────────┘
                    │ HTTP/JSON
┌───────────────────▼─────────────────────────────┐
│                   Backend                        │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐│
│  │   Handler   │──│   Service   │──│   Repo   ││
│  │   (web/)    │  │(application)│  │          ││
│  └─────────────┘  └─────────────┘  └────┬─────┘│
└─────────────────────────────────────────│──────┘
                                          │
┌─────────────────────────────────────────▼──────┐
│              PostgreSQL + Redis                 │
└────────────────────────────────────────────────┘
```

## Backend Architecture

**Pattern: Handler -> Service -> Repository**

```
internal/
├── application/
│   ├── accounts/      # Auth, users, organizations
│   └── financial/     # Transactions, budgets, patterns
├── web/
│   ├── router.go      # Route definitions
│   ├── accounts/      # Auth handlers
│   └── financial/     # Financial handlers
└── migrations/        # SQL migrations (Goose)
```

### Layer Responsibilities

| Layer | Does | Does NOT |
|-------|------|----------|
| Handler | HTTP parsing, validation, auth check | Business logic |
| Service | Business logic, coordinates repos | Direct SQL |
| Repository | Data access, single table | Cross-domain JOINs |

## Frontend Architecture

```
frontend/src/
├── App.tsx            # Routing
├── api/               # API clients
├── components/        # UI components
├── contexts/          # Auth context
└── types/             # TypeScript interfaces
```

## Domain Model

### Core Entities

```
User
  └── Organization (1:1 currently, N:N planned)
        └── Account (checking, savings, credit)
              └── Transaction
                    └── Category (optional)

Category
  └── CategoryBudget (per month/year)
        └── PlannedEntry (recurring or one-time)
```

### Budget Flow

```
PlannedEntry ──┐
PlannedEntry ──┼── CategoryBudget ── Category ── Transactions
PlannedEntry ──┘    (month/year)                  (actual spend)
```

## API Structure

All financial endpoints under `/financial`:

```
/auth/*                    # Authentication
/accounts/me/              # Current user

/financial/
├── categories             # Transaction categories
├── accounts               # Bank accounts
│   └── {id}/transactions  # Account transactions
├── budgets/categories     # Category budgets
├── planned-entries        # Recurring/one-time entries
├── advanced-patterns      # Regex-based matching
└── match-suggestions      # Pattern matching
```

## Data Flow Examples

### OFX Import

```
POST /financial/accounts/{id}/transactions/import
        │
        ▼
    Handler.ImportOFX()
        │
        ▼
    Service.ImportTransactions()
        │
        ├── OFXParser.Parse(file)
        │
        └── Repository.BulkInsert()
                │
                ▼
            INSERT ... ON CONFLICT (account_id, ofx_fitid) DO NOTHING
```

### Budget Progress

```
GET /financial/budgets/categories
        │
        ▼
    Handler.ListCategoryBudgets()
        │
        ▼
    Service.GetCategoryBudgetProgress()
        │
        ├── Get CategoryBudget (budget_type: fixed/calculated/maior)
        ├── Get PlannedEntries (sum amounts if calculated/maior)
        └── Get Transactions (sum actual spending)
                │
                ▼
            Return: budgeted vs spent vs available
```

## Security Model

### Authentication

- Passwordless (magic codes via email)
- Session tokens stored in Redis
- 10-minute code expiry

### Authorization

- Organization-based isolation
- `X-Active-Organization` header required
- All data scoped to user's organization

### Data Protection

- No passwords stored
- Prepared statements (SQL injection prevention)
- CORS configured for specific origins

## Performance Considerations

### Database Indexes

Key indexes for performance:
```sql
-- Transaction lookups
idx_transactions_account_date (account_id, transaction_date DESC)
idx_transactions_unclassified (account_id) WHERE is_classified = false

-- Budget aggregations
idx_transactions_category_month (category_id, DATE_TRUNC('month', transaction_date))
```

### Scaling Notes

- Expected: 100 transactions/month per user
- Current capacity: ~10M transactions before partitioning needed
- Redis caching for sessions (no app-level caching yet)
