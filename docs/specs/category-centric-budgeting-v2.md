# Category-Centric Budgeting System with Planned Entries - Technical Specification v2

## Executive Summary

This specification describes a budgeting system where:
1. Each category has a monthly budget with type (Fixed/Calculated/Maior)
2. **Planned entries** represent expected expenses (can be recurrent or one-time)
3. Calculated budgets are **derived from sum of planned entries**
4. Months auto-consolidate lazily when user accesses them after month ends
5. Budgets copy forward from previous month by default

## Core Concepts

### 1. Category Budgets
- One per category per month
- Types: Fixed, Calculated, Maior
- Automatically created when month is accessed

### 2. Planned Entries (NEW)
- **Not transactions** - these are forecasted/expected expenses
- Examples:
  - "Rent - $1500 - due 5th - recurrent monthly"
  - "Birthday gift - $50 - due 15th - one-time"
  - "Weekly groceries - $150 - recurrent weekly"
- Can be recurrent (repeat every month) or one-time
- When actual transaction happens, it's compared against planned entry

### 3. Budget Calculation Rules

**Fixed Budget:**
- User manually sets total amount (e.g., $1500)
- Can have planned entries for tracking, but they don't affect budget amount
- Budget = user-defined fixed value

**Calculated Budget:**
- Budget = **sum of all planned entries** for that category
- If no planned entries → budget = $0
- Example:
  - Planned: "Rent $1500" + "Utilities $200" = **Budget: $1700**
- As you add/remove planned entries, budget auto-updates

**Maior Budget:**
- Calculate both:
  - Fixed: User-defined amount
  - Calculated: Sum of planned entries
- Use whichever is **lower** (more restrictive)

### 4. Recurrent Planned Entries
- Marked with `is_recurrent = true`
- When new month starts, recurrent entries auto-copy forward
- Example: "Rent $1500" copies to every month automatically

### 5. Lazy Consolidation
- When user accesses a past month (e.g., viewing November on December 2nd):
  - Check if October is consolidated
  - If not → consolidate October automatically
  - Then show November
- Consolidation happens "just in time" on first access

---

## 1. Data Model

### 1.1 Table: `category_budgets`

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

    -- For fixed budget: user-defined amount
    -- For calculated budget: auto-calculated from planned entries (stored for performance)
    -- For maior budget: stores the stricter value
    planned_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Consolidation
    is_consolidated BOOLEAN NOT NULL DEFAULT FALSE,
    consolidated_at TIMESTAMP,
    actual_spent_at_consolidation DECIMAL(15,2),

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, organization_id, category_id, month, year)
);

CREATE INDEX idx_category_budgets_lookup ON category_budgets(user_id, organization_id, month, year);
CREATE INDEX idx_category_budgets_category ON category_budgets(category_id, month, year);
CREATE INDEX idx_category_budgets_consolidation ON category_budgets(is_consolidated, month, year);
```

### 1.2 Table: `planned_entries` (NEW)

```sql
CREATE TABLE planned_entries (
    planned_entry_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id),
    category_id INTEGER NOT NULL REFERENCES categories(category_id),

    -- Entry details
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),

    -- Temporal
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    expected_date DATE, -- Optional: specific due date (e.g., "5th of month")

    -- Recurrence
    is_recurrent BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_frequency VARCHAR(20), -- 'monthly', 'weekly', 'yearly', null

    -- Tracking
    is_fulfilled BOOLEAN NOT NULL DEFAULT FALSE, -- True when actual transaction created
    linked_transaction_id INTEGER REFERENCES transactions(transaction_id),

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Business rules
    CHECK (is_recurrent = FALSE OR recurrence_frequency IS NOT NULL)
);

CREATE INDEX idx_planned_entries_lookup ON planned_entries(user_id, organization_id, category_id, month, year);
CREATE INDEX idx_planned_entries_recurrent ON planned_entries(is_recurrent, month, year);
CREATE INDEX idx_planned_entries_category ON planned_entries(category_id);
```

### 1.3 Table: `monthly_snapshots`

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
            "budget_type": "calculated",
            "planned_amount": 800.00,
            "actual_spent": 750.00,
            "variance": -50.00,
            "status": "on_track",
            "planned_entries": [
                {"description": "Weekly shopping", "amount": 150, "is_recurrent": true},
                {"description": "Party supplies", "amount": 50, "is_recurrent": false}
            ]
        },
        ...
    ]
    */

    consolidated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, organization_id, month, year)
);

CREATE INDEX idx_monthly_snapshots_lookup ON monthly_snapshots(user_id, organization_id, year, month DESC);
```

---

## 2. Business Logic

### 2.1 Budget Initialization (Lazy Loading)

When user requests budgets for a month:

```go
func (s *service) GetMonthlyBudgets(ctx context.Context, input GetMonthlyBudgetsInput) (*MonthlyBudgets, error) {
    // 1. Check if previous month needs consolidation
    if input.Month > 1 {
        prevMonth := input.Month - 1
        prevYear := input.Year
        if prevMonth == 0 {
            prevMonth = 12
            prevYear = input.Year - 1
        }

        // Lazy consolidation
        err := s.ConsolidateMonthIfNeeded(ctx, prevMonth, prevYear)
        if err != nil {
            return nil, fmt.Errorf("consolidate previous month: %w", err)
        }
    }

    // 2. Check if budgets exist for requested month
    budgets, err := s.repo.FetchCategoryBudgets(ctx, FetchCategoryBudgetsParams{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
        Month:          input.Month,
        Year:           input.Year,
    })
    if err != nil {
        return nil, err
    }

    // 3. If no budgets exist, initialize from previous month
    if len(budgets) == 0 {
        err = s.InitializeBudgetsFromPreviousMonth(ctx, InitializeBudgetsInput{
            UserID:         input.UserID,
            OrganizationID: input.OrganizationID,
            Month:          input.Month,
            Year:           input.Year,
        })
        if err != nil {
            return nil, err
        }

        // Fetch again after initialization
        budgets, err = s.repo.FetchCategoryBudgets(ctx, FetchCategoryBudgetsParams{
            UserID:         input.UserID,
            OrganizationID: input.OrganizationID,
            Month:          input.Month,
            Year:           input.Year,
        })
        if err != nil {
            return nil, err
        }
    }

    // 4. Calculate progress for each budget
    return s.CalculateMonthlyProgress(ctx, budgets)
}
```

### 2.2 Initialize Budgets from Previous Month

```go
func (s *service) InitializeBudgetsFromPreviousMonth(ctx context.Context, input InitializeBudgetsInput) error {
    // Get previous month
    prevMonth, prevYear := getPreviousMonth(input.Month, input.Year)

    // Fetch previous month's budgets
    prevBudgets, err := s.repo.FetchCategoryBudgets(ctx, FetchCategoryBudgetsParams{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
        Month:          prevMonth,
        Year:           prevYear,
    })
    if err != nil {
        return err
    }

    // If no previous month budgets, create from all categories
    if len(prevBudgets) == 0 {
        return s.CreateBudgetsForAllCategories(ctx, input)
    }

    // Copy budgets from previous month
    for _, prevBudget := range prevBudgets {
        // Create new budget with same settings
        newBudget := CategoryBudget{
            UserID:         input.UserID,
            OrganizationID: input.OrganizationID,
            CategoryID:     prevBudget.CategoryID,
            Month:          input.Month,
            Year:           input.Year,
            BudgetType:     prevBudget.BudgetType,
            PlannedAmount:  prevBudget.PlannedAmount, // Will be recalculated for 'calculated' type
        }

        err = s.repo.CreateCategoryBudget(ctx, newBudget)
        if err != nil {
            return err
        }
    }

    // Copy recurrent planned entries
    err = s.CopyRecurrentPlannedEntries(ctx, CopyRecurrentPlannedEntriesInput{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
        FromMonth:      prevMonth,
        FromYear:       prevYear,
        ToMonth:        input.Month,
        ToYear:         input.Year,
    })
    if err != nil {
        return err
    }

    // Recalculate budgets for 'calculated' type
    err = s.RecalculateCalculatedBudgets(ctx, RecalculateCalculatedBudgetsInput{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
        Month:          input.Month,
        Year:           input.Year,
    })
    if err != nil {
        return err
    }

    return nil
}
```

### 2.3 Copy Recurrent Planned Entries

```go
func (s *service) CopyRecurrentPlannedEntries(ctx context.Context, input CopyRecurrentPlannedEntriesInput) error {
    // Fetch recurrent entries from previous month
    recurrentEntries, err := s.repo.FetchRecurrentPlannedEntries(ctx, FetchRecurrentPlannedEntriesParams{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
        Month:          input.FromMonth,
        Year:           input.FromYear,
    })
    if err != nil {
        return err
    }

    // Copy each recurrent entry to new month
    for _, entry := range recurrentEntries {
        newEntry := PlannedEntry{
            UserID:              input.UserID,
            OrganizationID:      input.OrganizationID,
            CategoryID:          entry.CategoryID,
            Description:         entry.Description,
            Amount:              entry.Amount,
            Month:               input.ToMonth,
            Year:                input.ToYear,
            ExpectedDate:        adjustDateToNewMonth(entry.ExpectedDate, input.ToMonth, input.ToYear),
            IsRecurrent:         true,
            RecurrenceFrequency: entry.RecurrenceFrequency,
            IsFulfilled:         false,
            LinkedTransactionID: nil,
        }

        err = s.repo.CreatePlannedEntry(ctx, newEntry)
        if err != nil {
            return err
        }
    }

    return nil
}
```

### 2.4 Calculate Budget Amount (for Calculated type)

```go
func (s *service) RecalculateCalculatedBudgets(ctx context.Context, input RecalculateCalculatedBudgetsInput) error {
    // Get all calculated-type budgets for the month
    budgets, err := s.repo.FetchCategoryBudgetsByType(ctx, FetchCategoryBudgetsByTypeParams{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
        Month:          input.Month,
        Year:           input.Year,
        BudgetType:     BudgetTypeCalculated,
    })
    if err != nil {
        return err
    }

    // For each calculated budget, sum planned entries
    for _, budget := range budgets {
        plannedEntries, err := s.repo.FetchPlannedEntriesByCategory(ctx, FetchPlannedEntriesByCategoryParams{
            UserID:         input.UserID,
            OrganizationID: input.OrganizationID,
            CategoryID:     budget.CategoryID,
            Month:          input.Month,
            Year:           input.Year,
        })
        if err != nil {
            return err
        }

        // Sum all planned entry amounts
        total := decimal.Zero
        for _, entry := range plannedEntries {
            total = total.Add(entry.Amount)
        }

        // Update budget planned_amount
        err = s.repo.UpdateCategoryBudgetAmount(ctx, UpdateCategoryBudgetAmountParams{
            CategoryBudgetID: budget.CategoryBudgetID,
            PlannedAmount:    total,
        })
        if err != nil {
            return err
        }
    }

    return nil
}
```

### 2.5 Maior Budget Calculation

```go
func (s *service) CalculateMaiorBudget(ctx context.Context, budget CategoryBudget) (decimal.Decimal, error) {
    // Fixed amount (user-defined)
    fixedAmount := budget.PlannedAmount

    // Calculated amount (sum of planned entries)
    plannedEntries, err := s.repo.FetchPlannedEntriesByCategory(ctx, FetchPlannedEntriesByCategoryParams{
        CategoryID: budget.CategoryID,
        Month:      budget.Month,
        Year:       budget.Year,
    })
    if err != nil {
        return decimal.Zero, err
    }

    calculatedAmount := decimal.Zero
    for _, entry := range plannedEntries {
        calculatedAmount = calculatedAmount.Add(entry.Amount)
    }

    // Maior = use stricter (lower) amount
    if calculatedAmount.LessThan(fixedAmount) {
        return calculatedAmount, nil
    }
    return fixedAmount, nil
}
```

### 2.6 Lazy Consolidation

```go
func (s *service) ConsolidateMonthIfNeeded(ctx context.Context, month, year int) error {
    // Check if month has ended
    now := time.Now()
    monthEnd := time.Date(year, time.Month(month+1), 1, 0, 0, 0, 0, time.UTC).Add(-time.Second)

    if now.Before(monthEnd) {
        return nil // Month hasn't ended yet
    }

    // Check if already consolidated
    exists, err := s.repo.CheckSnapshotExists(ctx, CheckSnapshotExistsParams{
        Month: month,
        Year:  year,
    })
    if err != nil {
        return err
    }
    if exists {
        return nil // Already consolidated
    }

    // Consolidate now
    return s.ConsolidateMonth(ctx, ConsolidateMonthInput{
        Month: month,
        Year:  year,
    })
}
```

---

## 3. API Endpoints

### 3.1 GET /financial/budgets?month={month}&year={year}

**Purpose:** Get all category budgets for a month (lazy-creates if needed)

**Response:**
```json
{
  "status": 200,
  "data": {
    "month": 11,
    "year": 2025,
    "is_consolidated": false,
    "categories": [
      {
        "category_budget_id": 1,
        "category_id": 35,
        "category_name": "Groceries",
        "budget_type": "calculated",
        "planned_amount": "800.00",
        "actual_spent": "750.00",
        "variance": "-50.00",
        "status": "on_track",
        "planned_entries": [
          {
            "planned_entry_id": 1,
            "description": "Weekly shopping",
            "amount": "150.00",
            "is_recurrent": true,
            "is_fulfilled": false
          },
          {
            "planned_entry_id": 2,
            "description": "Party supplies",
            "amount": "50.00",
            "is_recurrent": false,
            "is_fulfilled": true,
            "linked_transaction_id": 123
          }
        ]
      }
    ],
    "totals": {
      "total_planned": "2500.00",
      "total_spent": "2300.00",
      "total_variance": "-200.00"
    }
  }
}
```

### 3.2 POST /financial/budgets/planned-entries

**Purpose:** Add a planned entry to a category

**Request:**
```json
{
  "category_id": 35,
  "month": 11,
  "year": 2025,
  "description": "Weekly groceries",
  "amount": 150.00,
  "expected_date": "2025-11-05",
  "is_recurrent": true,
  "recurrence_frequency": "weekly"
}
```

**Response:**
```json
{
  "status": 201,
  "data": {
    "planned_entry_id": 1,
    "category_id": 35,
    "description": "Weekly groceries",
    "amount": "150.00",
    "is_recurrent": true,
    "created_at": "2025-11-01T10:00:00Z"
  }
}
```

**Side Effect:** If category has `budget_type = 'calculated'`, recalculate budget amount.

### 3.3 PUT /financial/budgets/planned-entries/{id}

**Purpose:** Update a planned entry

**Request:**
```json
{
  "description": "Weekly groceries (updated)",
  "amount": 175.00
}
```

### 3.4 DELETE /financial/budgets/planned-entries/{id}

**Purpose:** Delete a planned entry

**Side Effect:** Recalculate budget if category is 'calculated' type.

### 3.5 PUT /financial/budgets/{category_budget_id}

**Purpose:** Update category budget configuration

**Request:**
```json
{
  "budget_type": "fixed",
  "planned_amount": 1500.00
}
```

**Notes:**
- If changing FROM `calculated` TO `fixed`: planned_amount becomes user-defined
- If changing FROM `fixed` TO `calculated`: recalculate from planned entries
- If changing TO `maior`: calculate both and use stricter

### 3.6 POST /financial/transactions (Enhanced)

**Purpose:** Create transaction and optionally link to planned entry

**Request:**
```json
{
  "account_id": 1,
  "category_id": 35,
  "amount": 150.00,
  "description": "Grocery shopping",
  "transaction_type": "debit",
  "transaction_date": "2025-11-05",
  "planned_entry_id": 1  // Optional: link to planned entry
}
```

**Side Effect:**
- If `planned_entry_id` provided:
  - Mark planned entry as fulfilled
  - Link transaction to planned entry

---

## 4. Frontend Changes

### 4.1 Monthly Budget View

**Component: `MonthlyBudgetView.tsx`**

```tsx
interface MonthlyBudgetViewProps {
  month: number;
  year: number;
}

// UI Layout:
// ┌─────────────────────────────────────────┐
// │ November 2025                           │
// │ Total Planned: $2,500 | Spent: $2,300  │
// ├─────────────────────────────────────────┤
// │ Groceries                     [Fixed ▼] │
// │   Budget: $800                          │
// │   Spent: $750 ━━━━━━━━━━━░░░ 93%      │
// │                                          │
// │   Planned Entries:                      │
// │   ☑ Weekly shopping    $150 (recurrent)│
// │   ☐ Party supplies     $50  (one-time) │
// │   + Add planned entry                   │
// ├─────────────────────────────────────────┤
// │ Transport                [Calculated ▼] │
// │   Budget: $300 (auto from entries)      │
// │   Spent: $280 ━━━━━━━━━░░░░░ 93%      │
// │                                          │
// │   Planned Entries:                      │
// │   ☐ Gas                $200 (recurrent)│
// │   ☐ Parking            $100 (one-time) │
// │   + Add planned entry                   │
// └─────────────────────────────────────────┘
```

**Features:**
1. Click category name → expand/collapse planned entries
2. Budget type dropdown → change type (fixed/calculated/maior)
3. For fixed: edit budget amount directly
4. For calculated: budget is read-only (sum of planned entries)
5. Checkbox next to planned entry → mark as fulfilled → links to transaction
6. "+ Add planned entry" → inline form

### 4.2 Add Planned Entry Modal

```tsx
interface PlannedEntryFormProps {
  categoryId: number;
  month: number;
  year: number;
  onSuccess: () => void;
}

// Form fields:
// - Description (text)
// - Amount (number)
// - Expected date (date picker - optional)
// - Is recurrent? (checkbox)
//   └─ If yes: Frequency dropdown (monthly/weekly/yearly)
// - [Cancel] [Save]
```

### 4.3 Transaction Creation (Enhanced)

When creating a transaction, show:
```tsx
// If category has unfulfilled planned entries:
┌──────────────────────────────────┐
│ Link to planned entry?           │
│ ○ New transaction                │
│ ● Weekly shopping ($150)         │
│ ○ Party supplies ($50)           │
└──────────────────────────────────┘
```

If user selects a planned entry:
- Pre-fill amount from planned entry
- Auto-link when transaction is saved
- Mark planned entry as fulfilled

---

## 5. Migration Strategy

### 5.1 Phase 1: Database Changes

1. Create `planned_entries` table
2. Modify `category_budgets` table (already mostly correct)
3. Add migration script to convert existing budgets

### 5.2 Phase 2: Data Migration

```sql
-- Migrate existing budgets to category_budgets
INSERT INTO category_budgets (user_id, organization_id, category_id, month, year, budget_type, planned_amount)
SELECT
    b.user_id,
    b.organization_id,
    bi.category_id,
    b.month,
    b.year,
    'fixed' AS budget_type, -- Default all to fixed
    bi.planned_amount
FROM budgets_deprecated b
JOIN budget_items_deprecated bi ON bi.budget_id = b.budget_id;

-- No planned entries in old system, start fresh
```

### 5.3 Phase 3: Backend Implementation

1. Implement lazy consolidation
2. Implement budget initialization from previous month
3. Implement planned entry CRUD
4. Implement calculated budget auto-calculation
5. Implement recurrent entry copying

### 5.4 Phase 4: Frontend Implementation

1. Build monthly budget view with planned entries
2. Add planned entry management UI
3. Enhance transaction creation to link planned entries
4. Add budget type switching

---

## 6. Example Workflows

### 6.1 First Time User - Setting Up November Budget

**November 1st, 2025:**

1. User navigates to "Budgets" → November 2025
2. Backend:
   - No budgets exist for November
   - No previous month (new user)
   - Creates budgets for all categories with type='calculated', amount=0
3. User sees:
   ```
   Groceries      [Calculated ▼] Budget: $0
   Transport      [Calculated ▼] Budget: $0
   Rent           [Calculated ▼] Budget: $0
   ```

4. User expands "Rent", adds planned entry:
   - "Monthly rent" - $1500 - recurrent monthly
5. Budget auto-updates: "Rent [Calculated ▼] Budget: $1500"

6. User changes Groceries to "Fixed", sets $800
7. User adds to Transport:
   - "Gas" - $200 - recurrent monthly
   - "Parking ticket" - $50 - one-time
8. Transport budget shows: "$250 (from 2 planned entries)"

### 6.2 Existing User - December Auto-Creation

**December 1st, 2025:**

1. Backend runs lazy consolidation:
   - User accesses December budgets
   - November is past → consolidate November first
   - Creates snapshot of November

2. Initialize December from November:
   - Copy all category budgets with same types/amounts
   - Copy recurrent planned entries:
     - "Monthly rent" $1500 → copied to December
     - "Gas" $200 → copied to December
     - "Parking ticket" $50 → NOT copied (one-time)

3. User sees December:
   ```
   Groceries      [Fixed ▼] Budget: $800
   Rent           [Calculated ▼] Budget: $1500
     ☐ Monthly rent $1500 (recurrent)
   Transport      [Calculated ▼] Budget: $200
     ☐ Gas $200 (recurrent)
   ```

4. Note: "Parking ticket" didn't copy (one-time), so Transport budget = $200 now

### 6.3 Mid-Month Category Addition

**November 15th, 2025:**

1. User creates new category: "Entertainment"
2. System auto-creates budget for November:
   - Type: calculated (default)
   - Amount: $0
   - No planned entries

3. User can:
   - Add planned entries (budget will auto-calculate)
   - Or change to Fixed and set amount manually

---

## 7. Business Rules Summary

| Rule | Behavior |
|------|----------|
| Budget initialization | Copy from previous month; if none, create with calculated/$0 |
| Recurrent entries | Auto-copy to next month on initialization |
| One-time entries | Do NOT copy to next month |
| Calculated budget | Always = sum of planned entries (auto-updates) |
| Fixed budget | User-defined; planned entries don't affect amount |
| Maior budget | min(fixed_amount, sum_of_planned_entries) |
| Consolidation timing | Lazy - on first access after month ends |
| Mid-month category add | Create with calculated/$0 for current month |
| Fulfilled planned entry | Links to transaction, marked with checkbox |
| Edit past month | Not allowed if consolidated (read-only) |

---

## 8. Key Insights

`★ Insight ─────────────────────────────────────`
**1. Planned Entries = Cash Flow Forecasting**: This isn't just budgeting - it's proactive financial planning. Users can see "I expect to spend $X on Y date" and track if reality matches expectations. This is how professional accountants manage business finances.

**2. Recurrence Reduces Mental Load**: By marking "Rent $1500" as recurrent, users never forget to budget for it month-to-month. The system handles the tedious copying, so users focus on variable expenses.

**3. Calculated Budget = Automatic Discipline**: Users can't set an arbitrary budget if they use 'calculated' type. The budget becomes a direct reflection of their planned expenses, forcing honesty about spending intentions.

**4. Lazy Consolidation = No Maintenance Burden**: Users never have to remember to "close the month". The system does it automatically when they naturally move forward. This is better UX than forcing manual actions.

**5. Budget Type Flexibility**: Different categories need different strategies:
- Rent → Fixed (never changes)
- Groceries → Calculated (sum of planned weekly shopping)
- Transport → Maior (don't exceed EITHER fixed cap OR planned total)
`─────────────────────────────────────────────────`

---

## 9. Open Questions

1. **Planned entry fulfillment:** Should we auto-match transactions to planned entries by amount/date/category? Or always require manual linking?

2. **Recurrence day-of-month:** If user sets "Rent $1500 - due 5th - recurrent", should we preserve the "5th" when copying to next month? Or just copy amount/description?

3. **Over-budget warnings:** If sum of planned entries exceeds a reasonable threshold (e.g., > income), warn user?

4. **Planned entry vs transaction variance:** If planned entry is $150 but actual transaction is $175, should we:
   - Update planned entry amount?
   - Show as variance?
   - Leave unchanged?

5. **Bulk planned entry creation:** Allow importing recurrent entries in bulk? (e.g., "Add all my bills at once")

---

Would you like me to proceed with implementing this system? Or do you have feedback on the specification first?
