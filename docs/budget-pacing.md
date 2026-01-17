# Budget Pacing (Controllable Categories)

## Purpose

Provide pacing feedback for selected expense categories so users can see whether they are spending faster or slower than expected for the current day of the month.

This feature is enabled per-category via `categories.is_controllable`.

## Data Model

- `categories.is_controllable` (boolean)
  - When `true`, the category is included in pacing calculations.

See `docs/database.md` and `docs/domains.md` for schema/entity references.

## API

### GET /financial/budgets/categories/pacing

Returns pacing data for controllable categories.

Query params:
- `month` (1-12) optional, defaults to current month
- `year` (YYYY) optional, defaults to current year

Response includes (per category):
- `budget` (monthly planned amount)
- `spent` (actual spending so far)
- `expected` (expected spend at current day)
- `variance` (`spent - expected`)
- `status` (`under_pace`, `on_pace`, `over_pace`, `no_budget`)

## Calculation Rules

- `days_in_month` = calendar days in the requested month
- `progress` = `current_day / days_in_month`
- `expected` = `budget * progress`
- `variance` = `spent - expected`
- `status`:
  - `no_budget` when `budget == 0`
  - `on_pace` when `abs(variance) <= expected * 0.05`
  - `under_pace` when `variance < -(expected * 0.05)`
  - `over_pace` when `variance > expected * 0.05`

Notes:
- Only expense spending is considered (debit transactions, not ignored).
- Income categories are not intended as pacing targets.

## Frontend

- Dashboard renders the pacing widget in `frontend/src/components/BudgetPacingWidget.tsx`.
- Categories are flagged as controllable in `frontend/src/components/CategoryManager.tsx`.

## Related Documentation

- `docs/screens/dashboard.md`
- `docs/database.md`
- `docs/domains.md`
- `docs/architecture.md`
