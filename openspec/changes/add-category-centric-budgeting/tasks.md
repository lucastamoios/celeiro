# Implementation Tasks: Category-Centric Budgeting

These tasks are maintained as an OpenSpec-friendly checklist.

## 1. Core Implementation
- [x] Migrations:
  - [x] `00009_category_budgets.sql` (category_budgets, planned_entries, monthly_snapshots)
  - [x] `00010_migrate_budgets.sql`
  - [x] Apply migrations and verify schema
- [x] Domain models + DTOs:
  - [x] `CategoryBudgetModel`, `PlannedEntryModel`, `MonthlySnapshotModel`
  - [x] API DTOs for budgets/entries/snapshots
- [x] Repositories:
  - [x] Category budgets
  - [x] Planned entries
  - [x] Monthly snapshots
- [x] Services:
  - [x] Lazy month initialization + consolidation
  - [x] Budget calculations (fixed/calculated/maior)
  - [x] Variance warnings (1% warning, 10% critical)
  - [x] Planned entry lifecycle + instance generation
- [x] HTTP endpoints wired in router:
  - [x] Category budgets (`/financial/budgets/categories`)
  - [x] Planned entries (`/financial/planned-entries`)
  - [x] Monthly snapshots (`/financial/snapshots`)
- [x] Integration tests for budget workflow
- [x] Frontend updates for category-centric budgeting UI

## 2. Remaining Work
- [ ] Manual end-to-end testing of the category budget workflow
- [ ] Update API documentation for the category-centric budget endpoints
