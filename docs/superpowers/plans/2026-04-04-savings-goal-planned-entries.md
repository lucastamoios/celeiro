# Savings Goal Auto-Generated Planned Entries - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Savings goals auto-generate monthly planned entries in the correct category, with amounts calculated from the goal's target or a fixed monthly contribution.

**Architecture:** Add `category_id` and `monthly_contribution` columns to `savings_goals`. Hook into `GetPlannedEntriesForMonth` to lazily generate one planned entry per goal per month. Reserva goals calculate amount from remaining target/months; investimento goals use a fixed monthly contribution.

**Tech Stack:** Go (backend), PostgreSQL (migration), React/TypeScript (frontend)

**Spec:** `docs/superpowers/specs/2026-04-04-savings-goal-planned-entries-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `backend/internal/migrations/00043_savings_goal_category.sql`

- [ ] **Step 1: Write the migration**

```sql
-- +goose Up
ALTER TABLE savings_goals ADD COLUMN category_id INT REFERENCES categories(category_id) ON DELETE SET NULL;
ALTER TABLE savings_goals ADD COLUMN monthly_contribution DECIMAL(15,2);

-- +goose Down
ALTER TABLE savings_goals DROP COLUMN IF EXISTS monthly_contribution;
ALTER TABLE savings_goals DROP COLUMN IF EXISTS category_id;
```

- [ ] **Step 2: Commit**

```bash
git add backend/internal/migrations/00043_savings_goal_category.sql
git commit -S -m "feat: add category_id and monthly_contribution to savings_goals"
```

---

### Task 2: Backend Model and DTO

**Files:**
- Modify: `backend/internal/application/financial/models.go:287-310` (SavingsGoalModel)
- Modify: `backend/internal/application/financial/dto.go:479-525` (SavingsGoal DTO + FromModel)

- [ ] **Step 1: Add fields to SavingsGoalModel**

In `models.go`, add to the `SavingsGoalModel` struct after the `Notes` field (line 309):

```go
CategoryID          *int             `db:"category_id"`
MonthlyContribution *decimal.Decimal `db:"monthly_contribution"`
```

- [ ] **Step 2: Add fields to SavingsGoal DTO**

In `dto.go`, add to the `SavingsGoal` struct after the `Notes` field (line 494):

```go
CategoryID          *int             `json:"category_id,omitempty"`
MonthlyContribution *decimal.Decimal `json:"monthly_contribution,omitempty"`
```

- [ ] **Step 3: Update FromModel**

In `dto.go`, in `SavingsGoal.FromModel()` (around line 499), add to the dto struct literal:

```go
CategoryID:          model.CategoryID,
MonthlyContribution: model.MonthlyContribution,
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/application/financial/models.go backend/internal/application/financial/dto.go
git commit -S -m "feat: add category_id and monthly_contribution to savings goal model and DTO"
```

---

### Task 3: Backend Repository - Insert and Modify

**Files:**
- Modify: `backend/internal/application/financial/repository.go:2264-2316` (insertSavingsGoalParams, insertSavingsGoalQuery, InsertSavingsGoal)
- Modify: `backend/internal/application/financial/repository.go:2318-2378` (modifySavingsGoalParams, modifySavingsGoalQuery, ModifySavingsGoal)

- [ ] **Step 1: Update insertSavingsGoalParams**

Add to `insertSavingsGoalParams` struct (after `Notes`):

```go
CategoryID          *int
MonthlyContribution *decimal.Decimal
```

- [ ] **Step 2: Update insertSavingsGoalQuery**

Update the INSERT query to include the new columns. The VALUES clause changes from `$10` to `$12`:

```sql
INSERT INTO savings_goals (
    user_id, organization_id, name, goal_type, target_amount,
    initial_amount, due_date, icon, color, notes,
    category_id, monthly_contribution
) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12)
RETURNING
    savings_goal_id, created_at, updated_at, user_id, organization_id,
    name, goal_type, target_amount, initial_amount, due_date,
    icon, color, is_active, is_completed, completed_at, notes,
    category_id, monthly_contribution;
```

- [ ] **Step 3: Update InsertSavingsGoal call**

Add the new params to the `r.db.Query` call:

```go
func (r *repository) InsertSavingsGoal(ctx context.Context, params insertSavingsGoalParams) (SavingsGoalModel, error) {
	var goal SavingsGoalModel
	err := r.db.Query(ctx, &goal, insertSavingsGoalQuery,
		params.UserID, params.OrganizationID, params.Name, params.GoalType,
		params.TargetAmount, params.InitialAmount, params.DueDate, params.Icon, params.Color, params.Notes,
		params.CategoryID, params.MonthlyContribution)
	return goal, err
}
```

- [ ] **Step 4: Update modifySavingsGoalParams**

Add to `modifySavingsGoalParams` struct (after `IsCompleted`):

```go
CategoryID          *int
MonthlyContribution *decimal.Decimal
```

- [ ] **Step 5: Update modifySavingsGoalQuery**

Add new SET clauses. The parameter numbering shifts - `$11` for `category_id`, `$12` for `monthly_contribution`:

```sql
UPDATE savings_goals
SET
    name = COALESCE($3, name),
    target_amount = COALESCE($4, target_amount),
    due_date = CASE WHEN $5 = '' THEN NULL WHEN $5 IS NOT NULL THEN $5::date ELSE due_date END,
    icon = COALESCE($6, icon),
    color = COALESCE($7, color),
    notes = COALESCE($8, notes),
    is_active = COALESCE($9, is_active),
    is_completed = COALESCE($10, is_completed),
    completed_at = CASE
        WHEN $10 = true AND is_completed = false THEN CURRENT_TIMESTAMP
        WHEN $10 = false THEN NULL
        ELSE completed_at
    END,
    category_id = COALESCE($11, category_id),
    monthly_contribution = COALESCE($12, monthly_contribution),
    updated_at = CURRENT_TIMESTAMP
WHERE savings_goal_id = $1
    AND organization_id = $2
RETURNING
    savings_goal_id, created_at, updated_at, user_id, organization_id,
    name, goal_type, target_amount, initial_amount, due_date,
    icon, color, is_active, is_completed, completed_at, notes,
    category_id, monthly_contribution;
```

- [ ] **Step 6: Update ModifySavingsGoal call**

```go
func (r *repository) ModifySavingsGoal(ctx context.Context, params modifySavingsGoalParams) (SavingsGoalModel, error) {
	var goal SavingsGoalModel
	err := r.db.Query(ctx, &goal, modifySavingsGoalQuery,
		params.SavingsGoalID, params.OrganizationID,
		params.Name, params.TargetAmount, params.DueDate,
		params.Icon, params.Color, params.Notes, params.IsActive, params.IsCompleted,
		params.CategoryID, params.MonthlyContribution)
	return goal, err
}
```

- [ ] **Step 7: Update FetchSavingsGoals and FetchSavingsGoalByID RETURNING clauses**

Both queries need `category_id, monthly_contribution` added to their SELECT/RETURNING columns. Find `fetchSavingsGoalsQuery` and `fetchSavingsGoalByIDQuery` and add the two new columns to the SELECT list.

- [ ] **Step 8: Update AddContribution RETURNING clause**

The `addContributionQuery` also needs `category_id, monthly_contribution` in its RETURNING clause.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/application/financial/repository.go
git commit -S -m "feat: repository support for savings goal category and monthly contribution"
```

---

### Task 4: Backend Service - Create and Update

**Files:**
- Modify: `backend/internal/application/financial/savings_goals_service.go:35-58` (CreateSavingsGoalInput, UpdateSavingsGoalInput)
- Modify: `backend/internal/application/financial/savings_goals_service.go:208-248` (CreateSavingsGoal)
- Modify: `backend/internal/application/financial/savings_goals_service.go:250-279` (UpdateSavingsGoal)

- [ ] **Step 1: Add fields to CreateSavingsGoalInput**

Add after `Notes` (line 46):

```go
CategoryID          *int
MonthlyContribution *decimal.Decimal
```

- [ ] **Step 2: Add fields to UpdateSavingsGoalInput**

Add after `Notes` (line 57):

```go
CategoryID          *int
MonthlyContribution *decimal.Decimal
```

- [ ] **Step 3: Pass new fields in CreateSavingsGoal**

In `CreateSavingsGoal` (line 231), add to the `insertSavingsGoalParams`:

```go
CategoryID:          input.CategoryID,
MonthlyContribution: input.MonthlyContribution,
```

- [ ] **Step 4: Pass new fields in UpdateSavingsGoal**

In `UpdateSavingsGoal` (line 263), add to the `modifySavingsGoalParams`:

```go
CategoryID:          input.CategoryID,
MonthlyContribution: input.MonthlyContribution,
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/application/financial/savings_goals_service.go
git commit -S -m "feat: service support for savings goal category and monthly contribution"
```

---

### Task 5: Backend Handler - Create and Update

**Files:**
- Modify: `backend/internal/web/financial/handler.go:2038-2079` (CreateSavingsGoal handler)
- Modify: `backend/internal/web/financial/handler.go:2081-2130` (UpdateSavingsGoal handler)

- [ ] **Step 1: Update CreateSavingsGoal handler request struct**

Add to the `req` struct (around line 2053):

```go
CategoryID          *int     `json:"category_id,omitempty"`
MonthlyContribution *float64 `json:"monthly_contribution,omitempty"`
```

- [ ] **Step 2: Pass new fields in CreateSavingsGoal handler**

Add to the `CreateSavingsGoalInput` (around line 2071):

```go
CategoryID: req.CategoryID,
```

And convert monthly_contribution to decimal:

```go
var monthlyContribution *decimal.Decimal
if req.MonthlyContribution != nil {
    mc := decimal.NewFromFloat(*req.MonthlyContribution)
    monthlyContribution = &mc
}
```

Then pass `MonthlyContribution: monthlyContribution` to the input.

- [ ] **Step 3: Update UpdateSavingsGoal handler request struct**

Add to the `req` struct (around line 2100):

```go
CategoryID          *int     `json:"category_id,omitempty"`
MonthlyContribution *float64 `json:"monthly_contribution,omitempty"`
```

- [ ] **Step 4: Pass new fields in UpdateSavingsGoal handler**

Convert and pass new fields similar to step 2, adding them to the `UpdateSavingsGoalInput`.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/web/financial/handler.go
git commit -S -m "feat: handler support for savings goal category and monthly contribution"
```

---

### Task 6: Backend - Auto-Generate Planned Entries in GetPlannedEntriesForMonth

This is the core logic. When the budget page loads for a month, we check savings goals and create missing planned entries.

**Files:**
- Modify: `backend/internal/application/financial/service.go:1552-1624` (GetPlannedEntriesForMonth)

- [ ] **Step 1: Add auto-generation logic after fetching entries**

In `GetPlannedEntriesForMonth`, after fetching recurrent entries (around line 1565), add a call to a new helper method. Insert this block before the status fetching (before line 1568):

```go
// Auto-generate planned entries for savings goals
if err := s.generateSavingsGoalEntries(ctx, params.UserID, params.OrganizationID, params.Month, params.Year); err != nil {
    // Log but don't fail - savings goal entries are supplementary
    logging.Logger.Warn("failed to generate savings goal entries", "error", err)
}
```

- [ ] **Step 2: Write the generateSavingsGoalEntries method**

Add to `savings_goals_service.go` at the end (after `calculateMonthsBetween`):

```go
// generateSavingsGoalEntries creates planned entries for savings goals that don't
// have one for the given month yet. Called lazily when budget page loads.
func (s *service) generateSavingsGoalEntries(ctx context.Context, userID, orgID, month, year int) error {
	isActive := true
	isCompleted := false

	// 1. Fetch all active, non-completed savings goals
	goals, err := s.Repository.FetchSavingsGoals(ctx, fetchSavingsGoalsParams{
		UserID:         userID,
		OrganizationID: orgID,
		IsActive:       &isActive,
		IsCompleted:    &isCompleted,
	})
	if err != nil {
		return fmt.Errorf("fetch savings goals: %w", err)
	}

	// 2. Fetch existing planned entries for this month to check for duplicates
	existingEntries, err := s.Repository.FetchPlannedEntries(ctx, fetchPlannedEntriesParams{
		UserID:         userID,
		OrganizationID: orgID,
		IsActive:       &isActive,
	})
	if err != nil {
		return fmt.Errorf("fetch planned entries: %w", err)
	}

	// Build set of savings_goal_id that already have an entry this month
	existingGoalIDs := make(map[int]bool)
	for _, entry := range existingEntries {
		if entry.SavingsGoalID != nil {
			// Check if this entry was created for the requested month
			if int(entry.CreatedAt.Month()) == month && entry.CreatedAt.Year() == year {
				existingGoalIDs[*entry.SavingsGoalID] = true
			}
		}
	}

	now := s.system.Time.Now()
	requestedMonth := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)

	for _, goal := range goals {
		// Skip goals without a category
		if goal.CategoryID == nil {
			continue
		}

		// Skip if already has an entry for this month
		if existingGoalIDs[goal.SavingsGoalID] {
			continue
		}

		// Calculate the amount for this month
		amount, ok := s.calculateGoalMonthlyAmount(ctx, goal, now, requestedMonth)
		if !ok {
			continue
		}

		// Create the planned entry
		goalID := goal.SavingsGoalID
		_, err := s.Repository.InsertPlannedEntry(ctx, insertPlannedEntryParams{
			UserID:         userID,
			OrganizationID: orgID,
			CategoryID:     *goal.CategoryID,
			SavingsGoalID:  &goalID,
			Description:    goal.Name,
			Amount:         amount,
			EntryType:      PlannedEntryTypeExpense,
			IsRecurrent:    false,
		})
		if err != nil {
			return fmt.Errorf("create entry for goal %d: %w", goal.SavingsGoalID, err)
		}
	}

	return nil
}

// calculateGoalMonthlyAmount returns the amount for a savings goal planned entry.
// Returns (amount, true) if an entry should be created, or (zero, false) to skip.
func (s *service) calculateGoalMonthlyAmount(ctx context.Context, goal SavingsGoalModel, now time.Time, requestedMonth time.Time) (decimal.Decimal, bool) {
	// Calculate current amount (initial + transactions)
	transactions, err := s.Repository.FetchGoalContributions(ctx, fetchGoalContributionsParams{
		SavingsGoalID:  goal.SavingsGoalID,
		UserID:         goal.UserID,
		OrganizationID: goal.OrganizationID,
	})
	if err != nil {
		return decimal.Zero, false
	}

	currentAmount := goal.InitialAmount
	for _, tx := range transactions {
		if tx.TransactionType == TransactionTypeCredit {
			currentAmount = currentAmount.Add(tx.Amount)
		} else {
			currentAmount = currentAmount.Sub(tx.Amount)
		}
	}

	// Skip if goal already reached
	if currentAmount.GreaterThanOrEqual(goal.TargetAmount) {
		return decimal.Zero, false
	}

	remaining := goal.TargetAmount.Sub(currentAmount)

	switch goal.GoalType {
	case SavingsGoalTypeReserva:
		// Must have a due_date
		if goal.DueDate == nil {
			return decimal.Zero, false
		}
		// Skip if past due date
		if goal.DueDate.Before(requestedMonth) {
			return decimal.Zero, false
		}
		monthsRemaining := calculateMonthsRemaining(requestedMonth, *goal.DueDate)
		if monthsRemaining <= 0 {
			// Due this month - use full remaining
			return remaining, true
		}
		return remaining.Div(decimal.NewFromInt(int64(monthsRemaining))), true

	case SavingsGoalTypeInvestimento:
		// Must have monthly_contribution set
		if goal.MonthlyContribution == nil || goal.MonthlyContribution.IsZero() {
			return decimal.Zero, false
		}
		// Use the lesser of monthly_contribution and remaining amount
		if goal.MonthlyContribution.GreaterThan(remaining) {
			return remaining, true
		}
		return *goal.MonthlyContribution, true

	default:
		return decimal.Zero, false
	}
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/application/financial/service.go backend/internal/application/financial/savings_goals_service.go
git commit -S -m "feat: auto-generate planned entries for savings goals on month load"
```

---

### Task 7: Frontend Types and API

**Files:**
- Modify: `frontend/src/types/savingsGoals.ts:7-24` (SavingsGoal interface)
- Modify: `frontend/src/types/savingsGoals.ts:81-99` (Request types)

- [ ] **Step 1: Add fields to SavingsGoal interface**

Add after `notes` (line 21):

```typescript
category_id?: number;
monthly_contribution?: string; // Decimal as string
```

- [ ] **Step 2: Add fields to CreateSavingsGoalRequest**

Add after `notes` (line 89):

```typescript
category_id?: number;
monthly_contribution?: number;
```

- [ ] **Step 3: Add fields to UpdateSavingsGoalRequest**

Add after `notes` (line 98):

```typescript
category_id?: number;
monthly_contribution?: number;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/savingsGoals.ts
git commit -S -m "feat: add category_id and monthly_contribution to savings goal types"
```

---

### Task 8: Frontend - Goal Form UI

**Files:**
- Modify: The savings goal create/edit form component (find with `grep -r "CreateSavingsGoalRequest" frontend/src/components/`)

- [ ] **Step 1: Find and read the goal form component**

Search for the component that handles savings goal creation/editing.

- [ ] **Step 2: Add category dropdown**

Add a category selector field (reuse the existing category dropdown pattern from other forms in the codebase). This should be wired to the `category_id` field.

- [ ] **Step 3: Add monthly contribution input**

Add a numeric input for `monthly_contribution`. Show it conditionally:
- For `investimento` goals: always show
- For `reserva` goals: hide (amount is calculated from target/deadline)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/
git commit -S -m "feat: add category and monthly contribution fields to savings goal form"
```

---

### Task 9: Documentation

**Files:**
- Modify: `docs/domains.md` (SavingsGoal section)
- Modify: `docs/database.md` (savings_goals table)

- [ ] **Step 1: Update domains.md**

Add `category_id` and `monthly_contribution` to the SavingsGoal entity table. Add note about auto-generated planned entries.

- [ ] **Step 2: Update database.md**

Add the new columns to the savings_goals table documentation.

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -S -m "docs: document savings goal category and auto-generated entries"
```

---

## Verification

After all tasks:

1. Run `make test` - all backend tests pass
2. Run frontend build - no TypeScript errors
3. Manual test flow:
   - Create a reserva goal with category + due_date
   - Open budget page for current month - verify planned entry appears
   - Open budget page again - verify no duplicate entry
   - Match the entry to a transaction - verify goal progress updates
   - Open next month's budget - verify new entry with recalculated amount
   - Create an investimento goal with category + monthly_contribution
   - Open budget page - verify entry appears with fixed amount
