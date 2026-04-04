# Savings Goal Auto-Generated Planned Entries

## Problem

Savings goals track progress toward a target amount, but users must manually create planned entries each month to budget for their goals. This creates friction and means budget pages don't reflect goal commitments.

## Solution

Add `category_id` and `monthly_contribution` to savings goals. Auto-generate a non-recurring planned entry for each month when the budget page is loaded, using lazy/on-demand generation.

## Data Model Changes

### `savings_goals` table - new columns

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `category_id` | INT | FK -> categories, nullable | Category for auto-generated entries |
| `monthly_contribution` | DECIMAL(15,2) | nullable, >= 0 | Fixed monthly amount for investimento goals |

### Rules

- **Reserva goals** (have `due_date`): `category_id` enables auto-generation. Amount = `(target_amount - current_amount) / months_remaining`
- **Investimento goals** (no `due_date`): `category_id` + `monthly_contribution` enables auto-generation. Amount = `monthly_contribution`
- If `category_id` is NULL, no auto-generation (backwards compatible)
- `monthly_contribution` is ignored for reserva goals

### Auto-generated planned entry fields

| Field | Value |
|-------|-------|
| `category_id` | Goal's category |
| `savings_goal_id` | Goal ID |
| `entry_type` | "expense" |
| `is_recurrent` | false |
| `description` | Goal name |
| `amount` | Calculated or fixed monthly contribution |
| `parent_entry_id` | NULL |
| `is_active` | true |

## Generation Logic

**Hook point:** `GetPlannedEntriesForMonth` service method (called by `GET /planned-entries/month`).

**Flow:**

1. Fetch existing planned entries for month/year (unchanged)
2. Fetch all active, non-completed savings goals with `category_id` set
3. For each goal, check if a planned entry already exists for this month with matching `savings_goal_id`
4. If not, calculate amount and auto-create:
   - **Reserva**: `(target_amount - current_amount) / months_remaining`
   - **Investimento**: `monthly_contribution`
5. Return all entries including newly generated ones

**Duplicate detection:** Check for existing planned entry where `savings_goal_id = goal.ID` in the requested month/year (based on `created_at` timestamp).

**Skip conditions (no entry generated):**
- Goal is completed (`is_completed = true`)
- Goal reached target (`current_amount >= target_amount`)
- Reserva goal past `due_date`
- `months_remaining = 0` for reserva: use full remaining amount
- Investimento goal with NULL `monthly_contribution`
- Goal has no `category_id`

## Progress Tracking

No new progress tracking code needed:

1. Planned entry has `savings_goal_id`
2. When matched to a transaction, transaction inherits `savings_goal_id` (existing behavior)
3. `GetSavingsGoalProgress` sums transactions with `savings_goal_id` (existing behavior)
4. Next month's entry amount recalculates automatically with updated `current_amount`

## API Changes

**Create/Update Savings Goal** - add to request body:
- `category_id` (int, nullable)
- `monthly_contribution` (float, nullable)

**Response DTOs** - include new fields in all savings goal responses.

No new endpoints required.

## Frontend Changes

**Create/Edit Goal form:**
- Category dropdown (reuse existing component)
- Monthly contribution input (shown for investimento goals or when no `due_date`)

**Budget page:** No changes - auto-generated entries appear as regular planned entries.
