# Design: Financial Management System

## Context

Celeiro has a working authentication scaffold with:
- Passwordless magic code auth
- RBAC with roles and permissions
- Multi-tenant organizations
- Users, organizations, user_organizations tables (migrations 00001-00002)

We need to add financial management on top of this foundation while maintaining:
- Organization isolation (users can only see their org's data)
- Service boundaries (no cross-domain JOINs)
- Future extensibility (multi-user organizations)

## Goals / Non-Goals

### Goals
- Import OFX files and store transactions
- Classify transactions automatically via rules
- Track budgets by category
- Aggregate monthly spending
- Prevent duplicate imports (FITID deduplication)
- Support future multi-user within organizations

### Non-Goals
- Frontend UI (separate change)
- Real-time bank sync (manual OFX upload only)
- Multi-currency (BRL only for MVP)
- Advanced analytics/reporting
- Budget forecasting/projections
- Receipt scanning/OCR

## Decisions

### 1. Serial IDs vs UUIDs

**Decision:** Use `SERIAL` for all primary keys (e.g., `account_id SERIAL`)

**Why:**
- 4x smaller storage (4 bytes vs 16 bytes)
- Faster integer joins vs UUID string comparison
- Human-readable for debugging
- Better B-tree index performance (sequential)

**Alternatives considered:**
- UUIDs: Rejected due to performance and storage overhead
- BigSerial: Overkill for expected data volume

**Trade-off:** Can't generate IDs client-side, but acceptable for server-only API

### 2. Dual FK: user_id + organization_id on Accounts

**Decision:** Accounts reference both `user_id` (owner) and `organization_id` (scope)

```sql
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    ...
    FOREIGN KEY (user_id, organization_id)
      REFERENCES user_organizations(user_id, organization_id)
);
```

**Why:**
- Clear ownership (user_id)
- Clear scope (organization_id)
- Enables future account sharing (multiple users, same org)
- Enforces user belongs to organization (composite FK)

**Alternatives considered:**
- Only user_id FK: Rejected - can't enforce org membership
- Only organization_id FK: Rejected - unclear ownership

### 3. FITID Deduplication Strategy

**Decision:** Use composite unique index `(account_id, ofx_fitid)`

```sql
CREATE UNIQUE INDEX idx_transactions_ofx_fitid
ON transactions(account_id, ofx_fitid);
```

**Why:**
- FITID unique per account (bank guarantee)
- Enables `INSERT ... ON CONFLICT DO NOTHING` for efficient bulk insert
- Re-importing same OFX file won't create duplicates

**Implementation:**
```go
INSERT INTO transactions (...) VALUES (...)
ON CONFLICT (account_id, ofx_fitid) DO NOTHING
RETURNING transaction_id
```

### 4. Classification Rule Priority

**Decision:** First matching rule wins, ordered by `priority ASC`

```sql
SELECT * FROM classification_rules
WHERE user_id = $1 AND is_active = true
ORDER BY priority ASC, created_at ASC
```

**Why:**
- Simple, predictable behavior
- Users can control order
- Performant (index on priority)

**Alternatives considered:**
- All matching rules with scoring: Too complex for MVP
- Category-specific rules only: Too restrictive

### 5. Budget Type Strategy

**Decision:** Support three budget types with runtime calculation

```go
type BudgetType string
const (
    BudgetTypeFixed      = "fixed"      // User-defined amount
    BudgetTypeCalculated = "calculated" // Sum of budget_items
    BudgetTypeHybrid     = "hybrid"     // max(fixed, calculated)
)

func CalculateBudgetAmount(budget Budget, items []BudgetItem) decimal.Decimal {
    itemsSum := sum(items)
    switch budget.Type {
    case BudgetTypeFixed:      return budget.Amount
    case BudgetTypeCalculated: return itemsSum
    case BudgetTypeHybrid:     return max(budget.Amount, itemsSum)
    }
}
```

**Why:**
- Flexible for different user preferences
- No denormalization needed
- Clear calculation logic

### 6. System Categories Seeding

**Decision:** Seed 7 system categories in migration with `user_id = NULL`

```sql
INSERT INTO categories (name, icon, is_system) VALUES
('Alimentação', '🍔', true),
('Transporte', '🚗', true),
('Moradia', '🏠', true),
('Saúde', '💊', true),
('Educação', '📚', true),
('Lazer', '🎮', true),
('Outros', '📦', true);
```

**Why:**
- Users get useful defaults immediately
- `is_system = true` prevents deletion
- `user_id = NULL` makes them global
- Users can create custom categories

### 7. Service Boundary: No Cross-Domain JOINs

**Decision:** Each repository accesses ONLY its own table(s)

**BAD:**
```go
// ❌ TransactionRepository accessing users table
query := `SELECT t.*, u.name FROM transactions t JOIN users u ...`
```

**GOOD:**
```go
// ✅ Handler composes data from multiple services
tx := transactionService.GetByID(ctx, id)
user := userService.GetByID(ctx, tx.UserID)
response := map[string]interface{}{"transaction": tx, "user": user}
```

**Why:**
- Clear boundaries
- Easy to test (mock services)
- Future-proof (can extract to microservices)

### 8. OFX Parser Design

**Decision:** Single parser handling both OFX 1.x (SGML) and 2.x (XML)

```go
type Parser interface {
    Parse(data []byte) ([]Transaction, error)
}

// Detect format and parse accordingly
func (p *parser) Parse(data []byte) ([]Transaction, error) {
    if isOFX2(data) {
        return parseXML(data)
    }
    return parseSGML(data)
}
```

**Why:**
- Banks use different formats
- Single interface for consumers
- Format detection automatic

**Alternatives considered:**
- Separate parsers: Rejected - adds complexity
- Only OFX 2.x: Rejected - many banks still use 1.x

## Risks / Trade-offs

### Risk: Transaction Table Growth
**Concern:** Millions of rows over time
**Mitigation:**
- Proper indexes on hot paths
- Plan for future partitioning by date if > 10M rows
- Current scale (1000 users × 1000 tx/year = 1M rows) is manageable

### Risk: OFX Format Variations
**Concern:** Banks may have non-standard OFX
**Mitigation:**
- Store raw OFX in `raw_ofx_data JSONB` for debugging
- Log parse errors with sample data
- Iterate based on real user files

### Trade-off: No Async Processing
**Decision:** Synchronous OFX import (no job queue)
**Pro:** Simpler code, immediate feedback
**Con:** Large files (>5000 tx) may timeout
**Mitigation:** Document max file size, add timeout warnings

### Trade-off: Serial IDs expose information
**Concern:** Sequential IDs leak record count
**Mitigation:** Acceptable for personal finance app (not public-facing)
**Future:** Use UUIDs in API responses if needed

## Migration Plan

### Order of Execution
1. **Migration 00003:** Categories (no dependencies)
2. **Migration 00004:** Accounts (depends on users, organizations)
3. **Migration 00005:** Transactions (depends on accounts, categories)
4. **Migration 00006:** Budgets + Budget Items (depends on categories)
5. **Migration 00007:** Classification Rules (depends on categories)

### Rollback Safety
Each migration has `-- +goose Down` section:
```sql
-- +goose Up
CREATE TABLE accounts (...);

-- +goose Down
DROP TABLE IF EXISTS accounts CASCADE;
```

**Note:** `CASCADE` drops dependent objects (FKs, indexes)

### Data Integrity
- Foreign keys enforce referential integrity
- Check constraints validate data (e.g., `month BETWEEN 1 AND 12`)
- Unique constraints prevent duplicates (e.g., FITID per account)
- NOT NULL on critical fields (e.g., account name, transaction amount)

## Testing Strategy

### Unit Tests
- OFX parser with sample files (valid, malformed, edge cases)
- Budget calculation logic (all three types)
- Classification rule matching (description, amount, combined)
- Repository CRUD operations (mocked DB)

### Integration Tests
- Full OFX import flow with testcontainers
- FITID deduplication verification
- Organization isolation (user can't see other org's data)
- Classification rule priority ordering
- Budget aggregation queries

### Test Data
- Create `testdata/ofx/` with sample OFX files:
  - `checking_account.ofx` - Standard checking transactions
  - `credit_card.ofx` - Credit card transactions
  - `malformed.ofx` - Invalid OFX for error handling
  - `duplicate_fitid.ofx` - Test deduplication

## Open Questions

None - design is complete and ready for implementation.
