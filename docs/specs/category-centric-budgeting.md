# Category-Centric Budgeting System - Technical Specification

## Executive Summary

This specification describes a redesign of the budgeting system from a monthly-budget-centric model to a **category-centric model** where each category has its own monthly budget with a type (Fixed/Calculated/Maior), and monthly totals are derived aggregations rather than primary entities.

## Current Architecture Problems

### Current Model:
```
Budget (monthly)
├── budget_type: fixed/calculated/maior
├── amount: total monthly budget
└── BudgetItems[]
    ├── category_id
    └── planned_amount
```

**Issues:**
1. Budget type applies to entire month, not individual categories
2. User must explicitly create budgets and add items
3. No automatic initialization of categories
4. No historical snapshots when months close

## Proposed Architecture

### New Model:
```
CategoryBudget (per category per month)
├── category_id
├── month/year
├── budget_type: fixed/calculated/maior
├── planned_amount
└── is_consolidated: boolean

MonthlySnapshot (created when month closes)
├── month/year
├── total_planned
├── total_spent
├── category_snapshots[] (JSON)
└── consolidated_at
```

---

## 1. Data Model Changes

### 1.1 New Table: `category_budgets`

**Purpose:** Primary budgeting entity - one row per category per month.

```sql
CREATE TABLE category_budgets (
    category_budget_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id),
    category_id INTEGER NOT NULL REFERENCES categories(category_id),

    -- Temporal scope
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),

    -- Budget configuration
    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('fixed', 'calculated', 'maior')),
    planned_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Consolidation
    is_consolidated BOOLEAN NOT NULL DEFAULT FALSE,
    consolidated_at TIMESTAMP,
    actual_spent_at_consolidation DECIMAL(15,2),

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, organization_id, category_id, month, year),
    CHECK (NOT is_consolidated OR (consolidated_at IS NOT NULL AND actual_spent_at_consolidation IS NOT NULL))
);

CREATE INDEX idx_category_budgets_lookup ON category_budgets(user_id, organization_id, month, year);
CREATE INDEX idx_category_budgets_category ON category_budgets(category_id, month, year);
CREATE INDEX idx_category_budgets_consolidation ON category_budgets(is_consolidated, month, year);
```

### 1.2 New Table: `monthly_snapshots`

**Purpose:** Historical record created when a month is consolidated (closed).

```sql
CREATE TABLE monthly_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id),

    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),

    -- Aggregated totals
    total_planned DECIMAL(15,2) NOT NULL,
    total_spent DECIMAL(15,2) NOT NULL,
    total_variance DECIMAL(15,2) NOT NULL,

    -- Category details (JSON array)
    category_snapshots JSONB NOT NULL,
    /* Structure:
    [
        {
            "category_id": 35,
            "category_name": "Groceries",
            "budget_type": "fixed",
            "planned_amount": 1500.00,
            "actual_spent": 1450.00,
            "variance": -50.00,
            "status": "on_track"
        },
        ...
    ]
    */

    consolidated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, organization_id, month, year)
);

CREATE INDEX idx_monthly_snapshots_lookup ON monthly_snapshots(user_id, organization_id, year, month DESC);
```

### 1.3 Migration from Current Model

**Phase 1: Create new tables**
```sql
-- Create category_budgets table
-- Create monthly_snapshots table
```

**Phase 2: Migrate existing data**
```sql
-- For each existing budget:
--   For each budget_item in that budget:
--     INSERT INTO category_budgets (
--       user_id, organization_id, category_id, month, year,
--       budget_type = parent_budget.budget_type,
--       planned_amount = budget_item.planned_amount
--     )
```

**Phase 3: Deprecate old tables** (keep for historical reference)
```sql
-- Rename budgets → budgets_deprecated
-- Rename budget_items → budget_items_deprecated
-- Keep for data forensics but don't use in application
```

---

## 2. Auto-Creation Logic

### 2.1 Lazy Initialization Pattern

When user requests budget data for a month that doesn't have category budgets yet:

```
GET /financial/budgets?month=10&year=2025

Backend Logic:
1. Query: SELECT * FROM category_budgets WHERE month=10 AND year=2025
2. IF no results:
   a. Get all active categories for user
   b. For each category:
      - Create category_budget with:
        - budget_type = 'fixed' (default)
        - planned_amount = 0 (user must set)
   c. Return newly created category budgets
3. ELSE:
   Return existing category budgets
```

### 2.2 Service Method

```go
// EnsureCategoryBudgetsExist creates category budgets for a month if they don't exist
func (s *service) EnsureCategoryBudgetsExist(ctx context.Context, input EnsureCategoryBudgetsInput) error {
    // Check if any budgets exist for this month
    existing, err := s.repo.CountCategoryBudgets(ctx, CountCategoryBudgetsParams{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
        Month:          input.Month,
        Year:           input.Year,
    })
    if err != nil {
        return err
    }

    if existing > 0 {
        return nil // Already initialized
    }

    // Get all active categories
    categories, err := s.repo.FetchActiveCategories(ctx, FetchActiveCategoriesParams{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
    })
    if err != nil {
        return err
    }

    // Create budget for each category
    for _, cat := range categories {
        err = s.repo.CreateCategoryBudget(ctx, CreateCategoryBudgetParams{
            UserID:         input.UserID,
            OrganizationID: input.OrganizationID,
            CategoryID:     cat.CategoryID,
            Month:          input.Month,
            Year:           input.Year,
            BudgetType:     BudgetTypeFixed, // Default
            PlannedAmount:  decimal.Zero,
        })
        if err != nil {
            return fmt.Errorf("create budget for category %d: %w", cat.CategoryID, err)
        }
    }

    return nil
}
```

---

## 3. API Changes

### 3.1 New Endpoints

#### GET /financial/budgets?month={month}&year={year}
**Purpose:** Get all category budgets for a month (auto-creates if needed)

**Response:**
```json
{
  "status": 200,
  "data": {
    "month": 10,
    "year": 2025,
    "is_consolidated": false,
    "categories": [
      {
        "category_budget_id": 1,
        "category_id": 35,
        "category_name": "Groceries",
        "budget_type": "fixed",
        "planned_amount": "1500.00",
        "actual_spent": "1200.00",
        "variance": "-300.00",
        "status": "on_track"
      },
      {
        "category_budget_id": 2,
        "category_id": 36,
        "category_name": "Transport",
        "budget_type": "calculated",
        "planned_amount": "1000.00",
        "actual_spent": "1100.00",
        "variance": "100.00",
        "status": "over_budget"
      }
    ],
    "totals": {
      "total_planned": "2500.00",
      "total_spent": "2300.00",
      "total_variance": "-200.00",
      "overall_status": "on_track"
    }
  }
}
```

#### PUT /financial/budgets/{category_budget_id}
**Purpose:** Update a single category budget

**Request:**
```json
{
  "budget_type": "maior",
  "planned_amount": "1800.00"
}
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "category_budget_id": 1,
    "category_id": 35,
    "budget_type": "maior",
    "planned_amount": "1800.00",
    "updated_at": "2025-10-15T10:30:00Z"
  }
}
```

#### POST /financial/budgets/consolidate
**Purpose:** Close a month and create snapshot

**Request:**
```json
{
  "month": 10,
  "year": 2025
}
```

**Response:**
```json
{
  "status": 200,
  "data": {
    "snapshot_id": 1,
    "month": 10,
    "year": 2025,
    "total_planned": "2500.00",
    "total_spent": "2300.00",
    "consolidated_at": "2025-11-01T00:00:00Z"
  }
}
```

#### GET /financial/budgets/history?year={year}
**Purpose:** Get all consolidated monthly snapshots for a year

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "month": 1,
      "year": 2025,
      "total_planned": "3000.00",
      "total_spent": "2950.00",
      "consolidated_at": "2025-02-01T00:00:00Z"
    },
    {
      "month": 2,
      "year": 2025,
      "total_planned": "2800.00",
      "total_spent": "2600.00",
      "consolidated_at": "2025-03-01T00:00:00Z"
    }
  ]
}
```

### 3.2 Deprecated Endpoints

- `POST /financial/budgets` (create budget) → No longer needed
- `POST /financial/budgets/{id}/items` (add budget items) → No longer needed
- The old GET endpoints can redirect to new ones with migration layer

---

## 4. Business Logic Changes

### 4.1 Budget Type Per Category

Each category now has its own budget type:

**Fixed Budget (per category):**
- User sets planned amount (e.g., "Groceries: $1500")
- System compares actual spending to planned
- Daily prorating: Expected at day 15 of 30 = $750
- Status: on_track / warning / over_budget

**Calculated Budget (per category):**
- Planned amount is calculated from historical average
- Example: Last 3 months average spending on Transport = $1000
- System auto-fills planned_amount = $1000
- User can override if desired

**Maior Budget (per category):**
- User sets both fixed amount AND calculated amount
- System uses whichever is MORE restrictive (lower)
- Example:
  - Fixed: $1500
  - Calculated: $1200 (based on history)
  - Maior uses: $1200 (more restrictive)

### 4.2 Progress Calculation (Per Category)

```go
func (s *service) CalculateCategoryProgress(ctx context.Context, categoryBudgetID int) (*CategoryProgress, error) {
    // Get category budget
    budget, err := s.repo.FetchCategoryBudget(ctx, categoryBudgetID)
    if err != nil {
        return nil, err
    }

    // Get actual transactions for this category this month
    transactions, err := s.repo.FetchTransactionsByCategory(ctx, FetchTransactionsByCategoryParams{
        CategoryID: budget.CategoryID,
        Month:      budget.Month,
        Year:       budget.Year,
    })
    if err != nil {
        return nil, err
    }

    actualSpent := s.sumTransactions(transactions, TransactionTypeDebit)

    // Calculate based on budget type
    switch budget.BudgetType {
    case BudgetTypeFixed:
        return s.calculateFixedCategoryProgress(budget, actualSpent)
    case BudgetTypeCalculated:
        return s.calculateCalculatedCategoryProgress(budget, actualSpent)
    case BudgetTypeMaior:
        return s.calculateMaiorCategoryProgress(budget, actualSpent)
    default:
        return nil, fmt.Errorf("unknown budget type: %s", budget.BudgetType)
    }
}
```

### 4.3 Monthly Progress Calculation (Aggregation)

```go
func (s *service) CalculateMonthlyProgress(ctx context.Context, month, year int) (*MonthlyProgress, error) {
    // Ensure budgets exist for this month
    err := s.EnsureCategoryBudgetsExist(ctx, EnsureCategoryBudgetsInput{
        Month: month,
        Year:  year,
    })
    if err != nil {
        return nil, err
    }

    // Get all category budgets for the month
    budgets, err := s.repo.FetchCategoryBudgets(ctx, FetchCategoryBudgetsParams{
        Month: month,
        Year:  year,
    })
    if err != nil {
        return nil, err
    }

    // Calculate progress for each category
    var categories []CategoryProgress
    totalPlanned := decimal.Zero
    totalSpent := decimal.Zero

    for _, budget := range budgets {
        progress, err := s.CalculateCategoryProgress(ctx, budget.CategoryBudgetID)
        if err != nil {
            return nil, err
        }

        categories = append(categories, *progress)
        totalPlanned = totalPlanned.Add(budget.PlannedAmount)
        totalSpent = totalSpent.Add(progress.ActualSpent)
    }

    // Determine overall status
    variance := totalSpent.Sub(totalPlanned)
    status := determineOverallStatus(variance, totalPlanned)

    return &MonthlyProgress{
        Month:         month,
        Year:          year,
        Categories:    categories,
        TotalPlanned:  totalPlanned,
        TotalSpent:    totalSpent,
        TotalVariance: variance,
        OverallStatus: status,
    }, nil
}
```

### 4.4 Month Consolidation

```go
func (s *service) ConsolidateMonth(ctx context.Context, input ConsolidateMonthInput) error {
    // Check if already consolidated
    exists, err := s.repo.CheckSnapshotExists(ctx, CheckSnapshotExistsParams{
        Month: input.Month,
        Year:  input.Year,
    })
    if err != nil {
        return err
    }
    if exists {
        return ErrMonthAlreadyConsolidated
    }

    // Get current monthly progress
    progress, err := s.CalculateMonthlyProgress(ctx, input.Month, input.Year)
    if err != nil {
        return err
    }

    // Convert categories to JSON
    categorySnapshots := make([]map[string]interface{}, len(progress.Categories))
    for i, cat := range progress.Categories {
        categorySnapshots[i] = map[string]interface{}{
            "category_id":    cat.CategoryID,
            "category_name":  cat.CategoryName,
            "budget_type":    cat.BudgetType,
            "planned_amount": cat.PlannedAmount,
            "actual_spent":   cat.ActualSpent,
            "variance":       cat.Variance,
            "status":         cat.Status,
        }
    }

    // Create snapshot
    err = s.repo.CreateMonthlySnapshot(ctx, CreateMonthlySnapshotParams{
        Month:             input.Month,
        Year:              input.Year,
        TotalPlanned:      progress.TotalPlanned,
        TotalSpent:        progress.TotalSpent,
        TotalVariance:     progress.TotalVariance,
        CategorySnapshots: categorySnapshots,
    })
    if err != nil {
        return err
    }

    // Mark all category budgets as consolidated
    err = s.repo.MarkCategoryBudgetsConsolidated(ctx, MarkCategoryBudgetsConsolidatedParams{
        Month: input.Month,
        Year:  input.Year,
    })
    if err != nil {
        return err
    }

    return nil
}
```

---

## 5. Frontend Changes

### 5.1 Monthly Budget View

**Component: `MonthlyBudgetView.tsx`**

```tsx
interface MonthlyBudgetViewProps {
  month: number;
  year: number;
}

// Displays:
// 1. Month header with total planned vs actual
// 2. List of all categories (auto-created on load)
// 3. Each category shows:
//    - Category name
//    - Budget type dropdown (Fixed/Calculated/Maior)
//    - Planned amount input
//    - Actual spent (read-only, calculated)
//    - Progress bar
//    - Status indicator
// 4. Footer with "Consolidate Month" button (if month ended)
```

### 5.2 Category Budget Edit

**Inline editing:**
- Click on planned amount → editable input
- Change budget type → dropdown
- Auto-save on blur
- Optimistic UI updates

### 5.3 Historical View

**Component: `BudgetHistoryView.tsx`**

```tsx
// Displays:
// 1. Year selector
// 2. Grid/list of consolidated months
// 3. Click month → drill down to category details
// 4. Read-only view of historical data
```

---

## 6. Migration Strategy

### Phase 1: Backend Implementation (Week 1-2)
1. Create new tables with migrations
2. Implement new repository methods
3. Implement service layer (auto-creation, consolidation)
4. Create new API endpoints
5. Write comprehensive tests

### Phase 2: Data Migration (Week 2)
1. Write migration script to convert existing budgets → category_budgets
2. Run migration on staging environment
3. Validate data integrity
4. Keep old tables as `_deprecated` for rollback

### Phase 3: Frontend Implementation (Week 3)
1. Create new monthly budget view
2. Implement inline editing
3. Add consolidation UI
4. Create historical view

### Phase 4: Rollout (Week 4)
1. Deploy backend changes
2. Run data migration in production
3. Deploy frontend changes
4. Monitor for issues
5. After 2 weeks of stability, drop deprecated tables

---

## 7. Testing Strategy

### 7.1 Unit Tests

```go
// Test auto-creation
func TestEnsureCategoryBudgetsExist_CreatesForAllCategories(t *testing.T)
func TestEnsureCategoryBudgetsExist_DoesNotDuplicateExisting(t *testing.T)

// Test progress calculation per category
func TestCalculateCategoryProgress_FixedBudget_OnTrack(t *testing.T)
func TestCalculateCategoryProgress_CalculatedBudget_FromHistory(t *testing.T)
func TestCalculateCategoryProgress_MaiorBudget_UsesStricter(t *testing.T)

// Test consolidation
func TestConsolidateMonth_CreatesSnapshot(t *testing.T)
func TestConsolidateMonth_MarksConsolidated(t *testing.T)
func TestConsolidateMonth_PreventsDoubleConsolidation(t *testing.T)
```

### 7.2 Integration Tests

```go
// Test full workflow
func TestMonthlyBudgetWorkflow(t *testing.T) {
    // 1. Request budgets for new month → auto-creates
    // 2. Update category budgets
    // 3. Add transactions
    // 4. Calculate progress
    // 5. Consolidate month
    // 6. Verify snapshot created
}
```

### 7.3 Migration Tests

```sql
-- Test data migration
BEGIN;
    -- Insert old-style budget
    INSERT INTO budgets_deprecated (budget_type, amount) VALUES ('fixed', 3000);
    INSERT INTO budget_items_deprecated (budget_id, category_id, planned_amount)
        VALUES (1, 35, 1500), (1, 36, 1000);

    -- Run migration
    -- EXEC migration_script

    -- Assert category_budgets created correctly
    SELECT COUNT(*) FROM category_budgets WHERE month=10 AND year=2025;
    -- Expected: 2 (one per category)
ROLLBACK;
```

---

## 8. Edge Cases & Considerations

### 8.1 Adding New Category Mid-Month

**Scenario:** User creates new category "Entertainment" on Oct 15

**Solution:** Auto-create category_budget for current month with:
- budget_type = 'fixed' (default)
- planned_amount = 0
- User must set planned amount if desired

### 8.2 Deleting Category

**Scenario:** User deletes "Groceries" category

**Solution:**
- Keep historical category_budgets (for consolidated months)
- Mark category as deleted
- Don't show in current/future months
- Historical snapshots still reference it

### 8.3 Editing Consolidated Month

**Scenario:** User tries to edit October budget after it's consolidated

**Solution:**
- UI shows read-only view for consolidated months
- Backend rejects updates with 409 Conflict
- Error message: "Cannot edit consolidated month"

### 8.4 Calculated Budget with No History

**Scenario:** New user sets category to "calculated" but has no transactions

**Solution:**
- Show warning: "No historical data available"
- Default planned_amount = 0
- Suggest: "Switch to Fixed or add manual amount"

### 8.5 Maior Budget Conflict Resolution

**Scenario:** Fixed = $1500, Calculated = $1200, which to use?

**Solution:**
- Always use lower (more restrictive)
- UI shows both: "Using $1200 (calculated) instead of $1500 (fixed)"
- Tooltip explains: "Maior mode uses stricter limit"

---

## 9. Benefits of New Architecture

1. **Simpler UX:** No need to "create budget then add items" - just view month and edit
2. **Category-level control:** Each category has its own budget strategy
3. **Auto-initialization:** No manual setup required
4. **Historical tracking:** Consolidation preserves exact state of each month
5. **Flexible:** Mix budget types (Groceries=fixed, Transport=calculated, Rent=maior)
6. **Scalable:** Adding categories automatically adds to current month

---

## 10. Open Questions

1. **Consolidation timing:** Auto-consolidate on first day of new month? Or manual only?
2. **Editing past months:** Allow editing last month if not consolidated? Or enforce immediate consolidation?
3. **Calculated budget algorithm:** Average of last 3 months? Weighted average? User preference?
4. **Default budget type:** All start as Fixed, or let user set organization-wide default?
5. **Bulk operations:** UI for "copy last month's budgets"? "Set all to calculated"?

---

## 11. Success Metrics

- **User activation:** % of users who set at least one category budget
- **Engagement:** Average # of categories with planned amounts > 0
- **Retention:** Users who view budget screen 2+ times per month
- **Consolidation rate:** % of months that get consolidated
- **Time to setup:** Reduced from ~5 minutes to ~30 seconds (no budget creation needed)

---

## Appendix: Database Schema Summary

```
category_budgets
├── PK: category_budget_id
├── FK: user_id → users
├── FK: organization_id → organizations
├── FK: category_id → categories
├── month, year
├── budget_type (fixed/calculated/maior)
├── planned_amount
├── is_consolidated
└── UNIQUE(user_id, organization_id, category_id, month, year)

monthly_snapshots
├── PK: snapshot_id
├── FK: user_id → users
├── FK: organization_id → organizations
├── month, year
├── total_planned, total_spent, total_variance
├── category_snapshots (JSONB)
└── UNIQUE(user_id, organization_id, month, year)
```
