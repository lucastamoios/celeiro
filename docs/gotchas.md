# Gotchas and Project Conventions

Project-specific patterns, quirks, and things that might trip you up.

## Critical: Service Boundaries

**The most important rule in this codebase:**

Each repository ONLY accesses its own domain table. No cross-domain JOINs.

```go
// BAD - Repository crossing domains
func (r *TransactionRepository) GetWithUserInfo() {
    query := `SELECT t.*, u.name FROM transactions t JOIN users u...`
    // WRONG - use service composition instead
}

// GOOD - Service composition
func (h *Handler) GetTransaction() {
    tx, _ := h.transactionService.GetByID(ctx, id)
    user, _ := h.userService.GetByID(ctx, tx.UserID)
    // Compose response from separate service calls
}
```

See `CLAUDE.md` for detailed rules and examples.

---

## Naming Conventions

### Backend (Go)

- Repositories: `<Entity>Repository` with methods like `Create`, `GetByID`, `List`, `Update`, `Delete`
- Services: `<Entity>Service` or `<Feature>Service`
- Handlers: Live in `web/<domain>/handler.go`
- Context always first parameter: `func (s *Service) Method(ctx context.Context, ...)`

### Frontend (React)

- Components: PascalCase, one per file (`CategoryBudgetDashboard.tsx`)
- Hooks: `use` prefix (`useAuth`, `useTransactions`)
- Types: In `types/` folder for shared, co-located if single-use

### Database

- Tables: snake_case, plural (`planned_entries`, `category_budgets`)
- Columns: snake_case (`transaction_id`, `created_at`)
- Foreign keys: `<table>_id` format (`category_id`, `account_id`)

---

## Budget System Specifics

### Budget Types

Three budget types with specific calculation logic:

| Type | Calculation |
|------|-------------|
| `fixed` | Uses the set `planned_amount` directly |
| `calculated` | Sum of all planned entries in category |
| `maior` | MAX(fixed amount, sum of planned entries) |

### Category-Centric Budgeting

Budgets are tied to **categories**, not to a global monthly budget:
- Each category has its own budget per month/year
- Planned entries belong to categories
- Budget progress = spent vs budgeted per category

### Planned Entry Types

- **Recurrent**: Template that repeats monthly (`is_recurrent = true`)
- **One-time**: Specific date entry (`is_recurrent = false`, `specific_date` set)
- **Monthly Instance**: Generated from recurrent parent (`parent_entry_id` set)

---

## Authentication Pattern

### Passwordless Only

- No passwords stored - uses magic codes (4-digit, 10-minute expiry)
- User emails magic code request -> code sent via email -> validate to get session
- Sessions stored in Redis

### Headers

Required on authenticated requests:
- `Authorization: Bearer <session_token>`
- `X-Active-Organization: <org_id>` (for multi-org support)

### Auto-Registration

New emails automatically create user + organization on first login.

---

## OFX Import Behavior

### Duplicate Detection

Uses `ofx_fitid` (Financial Institution Transaction ID) unique per account:
```sql
UNIQUE (account_id, ofx_fitid)
```

Re-importing same OFX file = no duplicates (ON CONFLICT DO NOTHING).

### Raw Data Preservation

Original OFX data stored in `raw_ofx_data` JSONB for audit trail.

---

## Pattern Matching

### Two Pattern Types

1. **Simple Patterns**: Planned entries with `is_saved_pattern = true`
   - Match by description similarity, amount, day alignment

2. **Advanced Patterns**: Regex-based in `advanced_patterns` table
   - `description_pattern`: Regex for transaction description
   - `weekday_pattern`: Regex for day of week (0-6, Sunday=0)
   - `amount_min/max`: Amount range

### Match Confidence

Scores from 0-1:
- HIGH: >= 0.8
- MEDIUM: 0.5-0.8
- LOW: < 0.5

---

## Database Conventions

### IDs

Serial integers, not UUIDs:
- Smaller storage (4 bytes vs 16)
- Faster joins
- Better B-tree performance
- Trade-off: Can't generate client-side

### Soft Deletes

Some tables use `is_ignored` flag instead of actual DELETE:
- Transactions: `is_ignored` to hide without deleting

### Timestamps

All tables have:
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

---

## Frontend Patterns

### API Base URL

Configured in `frontend/.env`:
```
VITE_API_URL=http://localhost:9090
```

Leave empty for production (nginx proxies to backend).

### State Management

- Auth: React Context (`contexts/AuthContext.tsx`)
- Local UI: Component state
- No Redux/Zustand - keeping it simple

---

## Docker Development

### Starting Services

```bash
make up      # Start all (frontend, backend, postgres, redis, grafana)
make down    # Stop all
make restart # Rebuild and restart
```

### Viewing Logs

```bash
docker logs -f celeiro_backend
docker logs -f celeiro_frontend
docker logs -f celeiro_postgres
```

### Database Access

```bash
make dbshell  # Opens psql connected to celeiro_db
```

---

## Common Mistakes to Avoid

1. **Cross-domain JOINs in repositories** - Use service composition
2. **Forgetting X-Active-Organization header** - Required for all /financial endpoints
3. **Using relative paths in frontend** - API calls need full URL in dev
4. **Modifying recurrent parent when you want monthly change** - Generate instance first
5. **Not running migrations** - `make migrate` after schema changes
6. **Hardcoding ports** - Use env vars from `.env.dev`

---

## Testing

### Backend

```bash
make test                    # Unit tests
go test ./... -v             # Verbose
go test ./... -run TestName  # Specific test
```

### Test Files

Tests are co-located with source:
- `service.go` -> `service_test.go`
- `matching.go` -> `matching_test.go`
- `budget_progress.go` -> `budget_progress_test.go`
