# Backend Gotchas

Project-specific quirks, conventions, and non-obvious behaviors.

## Category Management

### System Categories Can Be Deleted

Unlike typical patterns, users CAN delete system-defined categories:

```sql
-- removeCategoryQuery allows deletion of system categories
DELETE FROM categories
WHERE category_id = $1 AND (user_id = $2 OR is_system = true);
```

**Why?** Users should have full control over their category structure. The `is_system` flag indicates default categories created on signup, but doesn't prevent modification.

**Related Files:**
- `internal/application/financial/repository.go` - `removeCategoryQuery`
- Frontend: `src/components/CategoryManager.tsx` - inline delete confirmation

### Category Deletion UI

- Delete button (trash icon) appears on hover for ALL category cards
- Inline confirmation: "Excluir? [Sim] [Nao]" - no modal popup
- Immediate deletion on confirm, no undo

## Transaction Patterns

### Original Description Preservation

When a transaction description is modified, the original bank description is preserved:

```go
type TransactionModel struct {
    Description         string   // Current (possibly user-edited)
    OriginalDescription *string  // Original from bank/OFX import
}
```

This allows:
- Amazon sync to reference original bank descriptions for matching
- Users to see what the bank originally called the transaction
- Pattern matching to work on consistent original data

## API Conventions

### Organization Header

All financial endpoints require `X-Active-Organization` header:

```
X-Active-Organization: 1
```

This is extracted in middleware and used for multi-tenant data isolation.

### Date Formats

- **Database**: PostgreSQL timestamps with timezone
- **API Input**: ISO 8601 string `2024-12-15` or `2024-12-15T10:30:00Z`
- **API Output**: ISO 8601 with timezone

## Service Boundaries

See `CLAUDE.md` at project root for complete service/repository boundary rules.

**Quick reminder:** Repositories only access their own domain tables. Cross-domain data requires service composition, not JOINs.

## Database Quirks

### Decimal Handling

All monetary values use `shopspring/decimal` for precision:

```go
import "github.com/shopspring/decimal"

amount := decimal.NewFromFloat(99.90)
```

Never use `float64` for money calculations.

### Soft Deletes

Categories, accounts, and budgets use `is_active` flags rather than hard deletes:

```sql
-- Typical "delete" is actually a soft delete
UPDATE categories SET is_active = false WHERE category_id = $1
```

**Exception:** Transactions are hard deleted (no `is_active` column).
