# Implementation Tasks: Category-Centric Budgeting

## Phase 1: Database Migrations (Blocking)
Foundation - must complete before any service work.

1. **Create migration 00009_category_budgets.sql**
   - Create `category_budgets` table with all constraints and indexes
   - Create `planned_entries` table with recurrence support
   - Create `monthly_snapshots` table for historical data
   - Validation: `goose status` shows migration pending, schema validates

2. **Create migration 00010_migrate_budgets.sql**
   - Write data migration script to convert budgets → category_budgets
   - Handle edge cases (budgets without items, duplicates)
   - Add validation checks (count verification)
   - Make migration idempotent
   - Validation: Test migration on copy of production data, verify counts match

3. **Apply migrations to dev environment**
   - Run `goose up` on dev database
   - Verify tables exist with correct schema
   - Verify indexes are created
   - Validation: Check `\d category_budgets` in psql

## Phase 2: Domain Models (Parallel OK)

4. **Create CategoryBudget domain model**
   - Add `CategoryBudgetModel` struct in `internal/application/financial/models.go`
   - Add `PlannedEntryModel` struct
   - Add `MonthlySnapshotModel` struct
   - Add helper methods (IsConsolidated, CanModify, etc.)
   - Validation: Models compile, struct tags correct

5. **Create DTOs for API**
   - Add `CategoryBudgetResponse` in `internal/application/financial/dto.go`
   - Add `PlannedEntryResponse`
   - Add `VarianceReportResponse`
   - Add request DTOs (CreateCategoryBudgetRequest, etc.)
   - Validation: DTOs compile, JSON tags correct

## Phase 3: Repository Layer (Dependencies: Phase 1, 2)

6. **Create CategoryBudgetRepository**
   - Implement `ListByMonth(ctx, userID, orgID, month, year)`
   - Implement `Create(ctx, budget)`
   - Implement `Update(ctx, budget)`
   - Implement `Get(ctx, budgetID)`
   - Implement `SoftDelete(ctx, budgetID)`
   - Validation: Write table-driven unit tests with testcontainers

7. **Create PlannedEntryRepository**
   - Implement `ListByCategory(ctx, categoryID)`
   - Implement `ListRecurrentTemplates(ctx, userID, orgID)`
   - Implement `Create(ctx, entry)`
   - Implement `Update(ctx, entry)`
   - Implement `SoftDelete(ctx, entryID)`
   - Implement `GetActiveByCategory(ctx, categoryID)` for calculation
   - Validation: Write unit tests

8. **Create MonthlySnapshotRepository**
   - Implement `Create(ctx, snapshot)`
   - Implement `ListByMonth(ctx, userID, orgID, month, year)`
   - Implement `Get(ctx, categoryID, month, year)`
   - Validation: Write unit tests ensuring immutability

## Phase 4: Service Layer (Dependencies: Phase 3)

9. **Create CategoryBudgetService - Core methods**
   - Implement `GetOrInitializeMonthBudgets` (lazy initialization)
   - Implement `RecalculateBudget` (for calculated/maior types)
   - Implement validation methods (CanModifyBudget)
   - Validation: Write service tests with mocked repositories

10. **Create CategoryBudgetService - Consolidation**
    - Implement `ConsolidateMonth` (freeze budgets, create snapshots)
    - Implement `CalculateActualSpending` (sum transactions)
    - Implement `GetPreviousMonth` helper
    - Validation: Test consolidation with sample data

11. **Create PlannedEntryService**
    - Implement `CreateEntry` (with budget recalculation trigger)
    - Implement `UpdateEntry` (with budget recalculation)
    - Implement `DeleteEntry` (handle recurrent templates)
    - Implement `GenerateMonthlyInstances` (from recurrent templates)
    - Validation: Test recurrent entry lifecycle

12. **Create VarianceService**
    - Implement `CalculateVariance` (planned vs actual)
    - Implement `GetVarianceLevel` (OK/WARNING/CRITICAL)
    - Implement `GenerateVarianceReport` (all categories for month)
    - Add variance threshold constants
    - Validation: Test edge cases (zero planned, negative variance)

## Phase 5: Handler Layer (Dependencies: Phase 4)

13. **Create CategoryBudgetHandlers**
    - Implement `GET /financial/category-budgets` (with lazy init)
    - Implement `POST /financial/category-budgets`
    - Implement `PATCH /financial/category-budgets/{id}`
    - Implement `DELETE /financial/category-budgets/{id}`
    - Add middleware for auth and org isolation
    - Validation: Write handler tests with httptest

14. **Create PlannedEntryHandlers**
    - Implement `GET /financial/planned-entries`
    - Implement `POST /financial/planned-entries`
    - Implement `PATCH /financial/planned-entries/{id}`
    - Implement `DELETE /financial/planned-entries/{id}`
    - Validation: Write handler tests

15. **Create ConsolidationHandler**
    - Implement `POST /financial/consolidate`
    - Add admin-only authorization check
    - Validation: Write handler test

16. **Create VarianceWarningHandler**
    - Implement `GET /financial/variance-warnings`
    - Validation: Write handler test with sample budgets

17. **Update router configuration**
    - Register new routes in `internal/handlers/router.go`
    - Add route group for `/financial/category-budgets`
    - Remove old `/financial/budgets` routes (return 404 with message)
    - Validation: Test routing with curl/httpie

## Phase 6: Integration & Data Migration (Dependencies: Phase 5)

18. **Run data migration on dev**
    - Apply migration 00010_migrate_budgets.sql
    - Validate data integrity (compare counts)
    - Test API endpoints with migrated data
    - Validation: All existing budgets accessible via new API

19. **Drop old tables (BREAKING)**
    - Create migration 00011_drop_old_budgets.sql
    - Drop `budget_items` table
    - Drop `budgets` table
    - Apply migration on dev
    - Validation: Old tables no longer exist

20. **Write integration tests**
    - Test full workflow: create category → create budget → add planned entry → consolidate
    - Test lazy initialization flow
    - Test variance warnings
    - Validation: All tests pass

## Phase 7: Frontend Updates (Can start in parallel with Phase 4)

21. **Update TypeScript types**
    - Add `CategoryBudget`, `PlannedEntry`, `VarianceReport` interfaces
    - Remove old `Budget`, `BudgetItem` types
    - Update API client types
    - Validation: Frontend compiles without type errors

22. **Update API client**
    - Add `getCategoryBudgets(month, year)`
    - Add `createPlannedEntry(entry)`
    - Add `getVarianceWarnings(month, year)`
    - Remove old budget API calls
    - Validation: API client methods compile

23. **Create CategoryBudgetList component**
    - Replace BudgetList with category-centric view
    - Show all categories with monthly budgets
    - Display variance indicators (OK/WARNING/CRITICAL)
    - Add filters (month selector)
    - Validation: Component renders with mock data

24. **Create PlannedEntryManager component**
    - Form to add/edit planned entries
    - Support recurrent vs one-time toggle
    - Show planned entries list per category
    - Validation: Can create and delete entries

25. **Update routing**
    - Update routes to use category-budgets endpoints
    - Remove old budget detail routes
    - Validation: Navigation works end-to-end

## Phase 8: Testing & Polish

26. **Manual end-to-end testing**
    - Test create category → initialize budget → add planned entries → view variance
    - Test lazy month initialization
    - Test consolidation
    - Test variance warnings
    - Validation: User can complete full budgeting workflow

27. **Performance testing**
    - Test with 50+ categories
    - Test with 100+ planned entries
    - Ensure lazy init completes <2s
    - Validation: Dashboard loads under 2s

28. **Update documentation**
    - Update API documentation
    - Add migration guide for existing users
    - Document new budgeting workflow
    - Validation: Documentation reviewed

## Dependencies & Parallelization

**Critical Path (Must be sequential)**:
- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

**Can be parallelized**:
- Phase 7 (Frontend) can start after Phase 2 (knowing API shape)
- Tasks within Phase 3 (different repositories)
- Tasks within Phase 5 (different handlers)

**Blocking tasks**:
- Task 3 (Apply migrations) blocks all subsequent work
- Task 19 (Drop old tables) is the final breaking change

## Success Criteria per Phase

**Phase 1**: ✅ All tables exist with correct schema
**Phase 2**: ✅ Models compile and represent domain correctly
**Phase 3**: ✅ All repository tests pass
**Phase 4**: ✅ All service tests pass, business logic validated
**Phase 5**: ✅ All API endpoints return 200/201 for happy paths
**Phase 6**: ✅ Old budgets successfully migrated, old tables dropped
**Phase 7**: ✅ Frontend can display and manage category budgets
**Phase 8**: ✅ E2E test passes, performance acceptable
