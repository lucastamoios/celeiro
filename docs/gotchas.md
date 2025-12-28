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

**Exception**: Read-only FK lookups for display (e.g., category_name in transaction list).

See `CLAUDE.md` for detailed rules and examples.

---

## Naming Conventions

### Backend Repository Methods

| Action | Prefix | Example |
|--------|--------|---------|
| Read one | `Fetch` | `FetchCategoryByID` |
| Read many | `Fetch` | `FetchCategories` |
| Create | `Insert` | `InsertCategory` |
| Update | `Modify` | `ModifyCategory` |
| Delete | `Remove` | `RemoveCategory` |

### Backend Service Methods

| Action | Prefix | Example |
|--------|--------|---------|
| Read one | `Get` | `GetCategoryByID` |
| Read many | `Get`/`List` | `GetCategories`, `ListAccounts` |
| Create | `Create` | `CreateCategory` |
| Update | `Update` | `UpdateCategory` |
| Delete | `Delete` | `DeleteCategory` |

### Frontend

- Components: PascalCase (`CategoryBudgetDashboard.tsx`)
- Hooks: `use` prefix (`useAuth`)
- Types: In `types/` for shared, co-located if single-use

### Database

- Tables: snake_case, plural (`planned_entries`)
- Columns: snake_case (`transaction_date`)
- Foreign keys: `<table>_id` (`category_id`)

---

## Budget System

### Budget Types

| Type | Calculation |
|------|-------------|
| `fixed` | Uses `planned_amount` directly |
| `calculated` | Sum of all planned entries |
| `maior` | MAX(fixed amount, sum of planned entries) |

### Category-Centric Model

Budgets are per-category, not global monthly:
- `CategoryBudget` = one category, one month/year
- `PlannedEntry` = expected expense in a category

### Planned Entry Types

| Type | Fields | Purpose |
|------|--------|---------|
| Recurrent | `is_recurrent=true`, `expected_day` set | Template that repeats |
| One-time | `is_recurrent=false` | Single occurrence |
| Monthly Instance | `parent_entry_id` set | Generated from recurrent |
| Saved Pattern | `is_saved_pattern=true` | For transaction matching |

---

## Pattern System

### Two Pattern Types

1. **Saved Patterns**: PlannedEntry with `is_saved_pattern=true`
   - Match by description similarity, amount, day

2. **Advanced Patterns**: Regex-based in `advanced_patterns` table
   - `description_pattern`: Regex for transaction description
   - `weekday_pattern`: Regex for day of week (0-6)
   - `amount_min/max`: Amount range

### Match Confidence

| Level | Score | Action |
|-------|-------|--------|
| HIGH | >= 0.70 | Auto-apply |
| MEDIUM | 0.50-0.70 | Suggest |
| LOW | < 0.50 | Ignore |

### Transaction Description Fields

- `description`: User-editable, shown in UI
- `original_description`: Immutable OFX value, used for pattern matching

---

## Authentication

### Passwordless Flow

```
1. POST /auth/request/ {email}     -> Magic code sent
2. POST /auth/validate/ {email, code} -> Session token returned
3. Use token in Authorization header
```

### Required Headers

```
Authorization: Bearer <session_token>
X-Active-Organization: <org_id>    # Required for /financial/*
```

### Auto-Registration

New emails automatically create user + organization on first login.

---

## OFX Import

### Duplicate Prevention

```sql
UNIQUE (account_id, ofx_fitid)
```

Re-importing same file = no duplicates (`ON CONFLICT DO NOTHING`).

### Raw Data Preservation

Original OFX stored in `raw_ofx_data` JSONB for audit.

---

## Database

### IDs

Serial integers (not UUIDs):
- Smaller storage, faster joins
- Trade-off: Can't generate client-side

### Soft Deletes

Transactions use `is_ignored` flag instead of DELETE.

### Timestamps

All tables have:
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

---

## Frontend

### API Base URL

```env
# frontend/.env
VITE_API_URL=http://localhost:9090   # Dev
VITE_API_URL=                        # Prod (nginx proxies)
```

### State Management

- Auth: React Context (`AuthContext.tsx`)
- Local UI: Component state
- No Redux/Zustand

---

## Common Mistakes

1. **Cross-domain JOINs in repos** - Use service composition
2. **Missing X-Active-Organization header** - Required for /financial/*
3. **Modifying recurrent parent for monthly change** - Generate instance first
4. **Not running migrations** - `make migrate` after schema changes
5. **Hardcoding ports** - Use env vars
6. **Forgetting `original_description`** - Patterns match against this, not `description`
