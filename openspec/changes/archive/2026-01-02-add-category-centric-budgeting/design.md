# Category-Centric Budgeting Design

## Architecture Overview

### Current (Monthly-Budget-Centric)
```
Monthly Budget
├── Budget Type: fixed/calculated/maior (applies to entire month)
├── Total Amount: $5,000
└── Budget Items (categories)
    ├── Restaurants: $500
    ├── Transport: $300
    └── Housing: $2,000
```

### Proposed (Category-Centric)
```
Categories (persistent)
├── Restaurants
│   ├── October 2025 Budget
│   │   ├── Type: calculated
│   │   ├── Planned Amount: $500 (from planned entries)
│   │   └── Planned Entries
│   │       ├── Weekly Lunch: $100 (recurrent)
│   │       └── Team Dinner: $50 (one-time)
│   └── November 2025 Budget (lazy-created from October)
└── Transport
    └── October 2025 Budget
        ├── Type: fixed
        └── Planned Amount: $300 (manual)
```

## Database Schema Design

### New Tables

#### `category_budgets` (replaces `budgets` + `budget_items`)
```sql
CREATE TABLE category_budgets (
    category_budget_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,

    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),

    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('fixed', 'calculated', 'maior')),
    planned_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (planned_amount >= 0),

    is_consolidated BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE when month ends
    consolidated_at TIMESTAMP,

    FOREIGN KEY (user_id, organization_id)
        REFERENCES user_organizations(user_id, organization_id),

    UNIQUE(user_id, organization_id, category_id, month, year)
);
```

**Key Design Decisions**:
- **One budget per category per month**: UNIQUE constraint enforces this
- **is_consolidated flag**: Marks when month is frozen (lazy consolidation)
- **planned_amount**: Pre-calculated for performance (recalculated only when planned entries change)
- **budget_type per category**: Each category decides how it's budgeted

#### `planned_entries` (new table for future transactions)
```sql
CREATE TABLE planned_entries (
    planned_entry_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,

    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),

    is_recurrent BOOLEAN NOT NULL DEFAULT FALSE,
    parent_entry_id INT REFERENCES planned_entries(planned_entry_id),  -- For monthly instances

    expected_day INT CHECK (expected_day BETWEEN 1 AND 31),  -- Day of month

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    FOREIGN KEY (user_id, organization_id)
        REFERENCES user_organizations(user_id, organization_id)
);
```

**Key Design Decisions**:
- **parent_entry_id**: Recurrent entries have a parent (template) and monthly instances (children)
- **expected_day**: When in the month this entry is expected (for matching)
- **is_recurrent**: Distinguishes templates from one-time entries
- **Separate from transactions**: Planned entries are NOT transactions until they happen

#### `monthly_snapshots` (new table for consolidated months)
```sql
CREATE TABLE monthly_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,

    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),

    planned_amount DECIMAL(15,2) NOT NULL,
    actual_amount DECIMAL(15,2) NOT NULL,
    variance_percent DECIMAL(5,2),

    budget_type VARCHAR(20) NOT NULL,

    UNIQUE(user_id, organization_id, category_id, month, year)
);
```

**Key Design Decisions**:
- **Immutable snapshots**: Once created, never updated (audit trail)
- **Captures both planned and actual**: Historical comparison
- **variance_percent**: Pre-calculated for reporting

### Migration Strategy

#### Phase 1: Create New Tables (Additive)
```sql
-- Migration 00009_category_budgets.sql
CREATE TABLE category_budgets (...);
CREATE TABLE planned_entries (...);
CREATE TABLE monthly_snapshots (...);
-- Keep old tables for now
```

#### Phase 2: Data Migration (Dual-Write Period)
```sql
-- Migration 00010_migrate_budgets.sql
INSERT INTO category_budgets (user_id, organization_id, category_id, month, year, ...)
SELECT
    b.user_id,
    b.organization_id,
    bi.category_id,
    b.month,
    b.year,
    'fixed' as budget_type,  -- Default all to fixed
    bi.planned_amount,
    false as is_consolidated
FROM budgets b
INNER JOIN budget_items bi ON bi.budget_id = b.budget_id
WHERE b.is_active = true;
```

#### Phase 3: Drop Old Tables (Breaking)
```sql
-- Migration 00011_drop_old_budgets.sql
DROP TABLE budget_items CASCADE;
DROP TABLE budgets CASCADE;
```

## Service Layer Design

### CategoryBudgetService

**Core Responsibilities**:
- Lazy month initialization: Create budgets for new month based on previous
- Calculate planned_amount from planned entries (for calculated/maior types)
- Consolidate months when period ends
- Validate variance thresholds (1% warning, 10% critical)

**Key Methods**:

```go
type CategoryBudgetService struct {
    repo           *CategoryBudgetRepository
    plannedRepo    *PlannedEntryRepository
    transactionSvc *TransactionService
    categorySvc    *CategoryService
}

// GetOrInitializeMonthBudgets lazy-loads budgets for a given month
// If month doesn't exist, copies from previous month
func (s *CategoryBudgetService) GetOrInitializeMonthBudgets(
    ctx context.Context,
    userID, orgID int,
    month, year int,
) ([]*CategoryBudget, error)

// RecalculateBudget recalculates planned_amount for calculated/maior budgets
// Sums all active planned entries for the category
func (s *CategoryBudgetService) RecalculateBudget(
    ctx context.Context,
    categoryBudgetID int,
) error

// ConsolidateMonth freezes budget for ended month
// Creates snapshot with actual vs planned amounts
func (s *CategoryBudgetService) ConsolidateMonth(
    ctx context.Context,
    userID, orgID int,
    month, year int,
) error

// CheckVarianceWarnings checks all category budgets for overspending
// Returns warnings (>1%) and critical (>10%)
func (s *CategoryBudgetService) CheckVarianceWarnings(
    ctx context.Context,
    userID, orgID int,
    month, year int,
) (*VarianceReport, error)
```

### PlannedEntryService

**Core Responsibilities**:
- Manage recurrent entry templates and instances
- Create monthly instances from recurrent parents
- Update budget calculations when entries change

**Key Methods**:

```go
type PlannedEntryService struct {
    repo              *PlannedEntryRepository
    categoryBudgetSvc *CategoryBudgetService
}

// CreateRecurrentEntry creates a parent entry (template)
func (s *PlannedEntryService) CreateRecurrentEntry(
    ctx context.Context,
    entry *PlannedEntry,
) error

// GenerateMonthlyInstances creates monthly entry instances from recurrent templates
// Called lazily when month is accessed
func (s *PlannedEntryService) GenerateMonthlyInstances(
    ctx context.Context,
    userID, orgID int,
    month, year int,
) error

// UpdateEntry updates an entry and recalculates affected budgets
func (s *PlannedEntryService) UpdateEntry(
    ctx context.Context,
    entryID int,
    amount decimal.Decimal,
) error
```

## Lazy Consolidation Flow

### When User Accesses a New Month

```
1. User requests budgets for November 2025
2. Service checks: Do November budgets exist?
   - NO → Lazy initialization
3. Copy October budgets to November:
   - Same budget_type
   - Same planned_amount (if fixed)
   - Recalculate planned_amount (if calculated/maior)
4. Generate monthly planned entry instances from recurrent templates
5. Return initialized budgets
```

**Implementation**:
```go
func (s *CategoryBudgetService) GetOrInitializeMonthBudgets(
    ctx context.Context,
    userID, orgID int,
    month, year int,
) ([]*CategoryBudget, error) {
    // Check if budgets exist
    budgets, err := s.repo.ListByMonth(ctx, userID, orgID, month, year)
    if err != nil {
        return nil, err
    }

    // If budgets exist, return them
    if len(budgets) > 0 {
        return budgets, nil
    }

    // Lazy initialization: copy from previous month
    prevMonth, prevYear := getPreviousMonth(month, year)
    prevBudgets, err := s.repo.ListByMonth(ctx, userID, orgID, prevMonth, prevYear)
    if err != nil {
        return nil, err
    }

    // If no previous budgets, get all categories and create zero budgets
    if len(prevBudgets) == 0 {
        return s.initializeFromCategories(ctx, userID, orgID, month, year)
    }

    // Copy previous budgets to new month
    newBudgets := make([]*CategoryBudget, 0, len(prevBudgets))
    for _, prev := range prevBudgets {
        newBudget := &CategoryBudget{
            UserID:         userID,
            OrganizationID: orgID,
            CategoryID:     prev.CategoryID,
            Month:          month,
            Year:           year,
            BudgetType:     prev.BudgetType,
            PlannedAmount:  prev.PlannedAmount,  // Copy as-is
        }

        // Recalculate if calculated or maior
        if prev.BudgetType == "calculated" || prev.BudgetType == "maior" {
            plannedSum, err := s.calculatePlannedSum(ctx, userID, orgID, prev.CategoryID)
            if err != nil {
                return nil, err
            }

            if prev.BudgetType == "calculated" {
                newBudget.PlannedAmount = plannedSum
            } else {  // maior
                newBudget.PlannedAmount = maxDecimal(prev.PlannedAmount, plannedSum)
            }
        }

        if err := s.repo.Create(ctx, newBudget); err != nil {
            return nil, err
        }
        newBudgets = append(newBudgets, newBudget)
    }

    return newBudgets, nil
}
```

## Trade-offs

### Decision: One table vs Two (budgets + items)
**Chosen**: Single `category_budgets` table
**Why**:
- Simpler mental model: one row = one category budget
- Faster queries: no JOINs needed for category budgets
- Better for lazy initialization: copy entire row
**Trade-off**: Less normalized, but categories are stable entities

### Decision: Lazy consolidation vs Scheduled job
**Chosen**: Lazy (on-access) consolidation
**Why**:
- Simpler deployment: no cron/scheduler needed
- Works even if user doesn't access system for months
- Consolidation triggered by user action (more predictable)
**Trade-off**: Slight delay on first access of new month

### Decision: Planned entries as separate table vs part of transactions
**Chosen**: Separate `planned_entries` table
**Why**:
- Clear separation: planned ≠ actual
- Different lifecycle: entries persist across months
- Easier to match planned → actual without polluting transactions
**Trade-off**: More tables, more complexity

### Decision: Pre-calculate planned_amount vs Calculate on-the-fly
**Chosen**: Pre-calculate and store in `planned_amount`
**Why**:
- Performance: Dashboard shows all categories (100s of queries)
- Consistency: planned_amount reflects state at consolidation time
**Trade-off**: Must recalculate when planned entries change (acceptable)

## API Design

### Endpoints (Breaking Changes)

**Category Budgets**:
```
GET    /financial/category-budgets?month=10&year=2025  # List all category budgets for month
POST   /financial/category-budgets                      # Create/update budget for category
PATCH  /financial/category-budgets/{id}                 # Update planned_amount or type
DELETE /financial/category-budgets/{id}                 # Soft-delete budget
```

**Planned Entries**:
```
GET    /financial/planned-entries?category_id=5         # List planned entries for category
POST   /financial/planned-entries                       # Create planned entry
PATCH  /financial/planned-entries/{id}                  # Update entry
DELETE /financial/planned-entries/{id}                  # Delete entry
```

**Consolidation**:
```
POST   /financial/consolidate?month=10&year=2025        # Manually consolidate month
```

**Old endpoints (REMOVED)**:
```
❌ GET    /financial/budgets                    # Replaced by category-budgets
❌ POST   /financial/budgets/{id}/items         # No longer needed
❌ PATCH  /financial/budgets/{id}/items/{itemId}
❌ DELETE /financial/budgets/{id}/items/{itemId}
```

## Frontend Impact

### UI Restructure

**Old**: Budget List → Budget Detail → Budget Items
**New**: Category List → Category Budget (per month)

**Category Budget View** (replaces Budget Detail):
```
┌──────────────────────────────────────────────┐
│ 🍔 Restaurants - October 2025                │
│                                              │
│ Budget Type: [Calculated ▼]                 │
│ Planned: R$ 500,00 (from 2 entries)         │
│ Actual:  R$ 523,00                          │
│ Status:  ⚠️ 4.6% over (warning)              │
│                                              │
│ Planned Entries:                             │
│ ├─ Weekly Lunch        R$ 400,00 (recurrent)│
│ └─ Team Dinner         R$ 100,00 (one-time) │
│                                              │
│ [+ Add Planned Entry]                        │
└──────────────────────────────────────────────┘
```

### TypeScript Types (New)

```typescript
interface CategoryBudget {
  categoryBudgetId: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  month: number;
  year: number;
  budgetType: 'fixed' | 'calculated' | 'maior';
  plannedAmount: number;
  actualAmount: number;  // Calculated on-the-fly
  variancePercent: number;
  isConsolidated: boolean;
}

interface PlannedEntry {
  plannedEntryId: number;
  categoryId: number;
  description: string;
  amount: number;
  isRecurrent: boolean;
  parentEntryId?: number;
  expectedDay?: number;
  isActive: boolean;
}
```
