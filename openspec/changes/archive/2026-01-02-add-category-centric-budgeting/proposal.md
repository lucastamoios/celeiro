# Add Category-Centric Budgeting

## Why

Currently, Celeiro uses a **monthly-budget-centric** model where:
- Users create a monthly budget (e.g., "October 2025 Budget")
- Budget items (categories) are children of that monthly budget
- Budget type (fixed/calculated/maior) applies to the entire month

This model has critical usability problems:
1. **Counter-intuitive**: Users think in terms of categories ("How much do I spend on restaurants?") not abstract monthly budgets
2. **No historical continuity**: When a month ends, category budgets don't automatically carry forward
3. **Manual setup required**: Users must recreate all category budgets every month
4. **Poor planning discipline**: No way to plan future spending with recurrent entries

**User expectation** (validated in conversation):
- "We should already have one budget for each category we created"
- "When the month starts, budgets should already exist based on last month"
- "I want to plan entries (recurrent/one-time) that count towards calculated budgets"
- "Show me warnings when I exceed my category budgets"

## What Changes

Restructure the budgeting system to be **category-centric**:

### Core Model Shift
- **From**: Monthly Budget → Budget Items (categories)
- **To**: Category Budgets (per month) with planned entries
- Each **category** has its own monthly budget with a type (fixed/calculated/maior)
- Budgets carry forward automatically each month (lazy consolidation)
- Planned entries (recurrent/one-time) feed into calculated budgets

### Key Capabilities
1. **Category Budgets**: Each category gets a monthly budget that persists across months
2. **Planned Entries**: Template transactions that become actual transactions (recurrent or one-time)
3. **Lazy Consolidation**: Month budgets auto-create when accessed, copying from previous month
4. **Budget Types per Category**: Fixed (manual), Calculated (sum of planned entries), Maior (max of both)
5. **Strict Variance Warnings**: 1% warning, 10% critical for category overspending

### Out of Scope
- Multi-month budget planning (remains monthly)
- Budget templates or presets
- Bulk editing across categories
- Budget rollover (beyond copying last month's values)

## Impact

### Breaking Changes
- **Database schema**: Remove `budgets` table, rename `budget_items` to `category_budgets`
- **API endpoints**: Complete redesign of budget API surface
- **Frontend**: Budget UI must be completely rebuilt
- **Migration required**: Existing budgets must be migrated to category-centric model

### Affected Components
**Backend**:
- `internal/migrations/00006_budgets.sql` - REPLACED with new schema
- `internal/application/financial/models.go` - Budget models replaced
- `internal/application/financial/service.go` - Budget service rewritten
- `internal/application/financial/budget_progress.go` - Adapt to category budgets
- `internal/handlers/financial/` - Budget handlers rewritten

**Frontend**:
- `src/types/budget.ts` - Type definitions replaced
- `src/components/BudgetList.tsx` - Rebuilt as category list
- Budget detail views - Complete redesign

### Dependencies
- Must be implemented **before** transaction matching system (needs planned entries)
- Requires careful data migration planning for existing budgets
- Frontend must be updated in parallel with backend

## Risks

### Data Migration
**Risk**: Existing budgets and budget items need migration
**Mitigation**:
- Create migration script that converts monthly budgets to category budgets
- Preserve historical data in archived format
- Validate migration with test data

### User Disruption
**Risk**: Complete change in UX paradigm
**Mitigation**:
- Clear migration guide
- Possibly keep old budget view in "read-only" mode during transition
- Provide examples of new workflow

### Implementation Complexity
**Risk**: This is a fundamental architectural change
**Mitigation**:
- Break into small, testable increments (see tasks.md)
- Start with database migration
- Build services incrementally
- Update frontend last

## Success Criteria

1. Users can view all categories with their monthly budgets in one screen
2. New categories added mid-month automatically get $0 budget
3. Budgets auto-populate next month based on previous month (lazy)
4. Planned entries (recurrent/one-time) correctly calculate budget amounts
5. Variance warnings trigger at 1% (warning) and 10% (critical)
6. All existing budget data successfully migrated
7. No regression in budget tracking functionality
