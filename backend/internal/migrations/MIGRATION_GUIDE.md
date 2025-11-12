# Budget Migration Guide

This guide explains how to migrate from the old budget system (budgets + budget_items) to the new category-centric budget system (category_budgets).

## Overview

The migration consists of three main steps:

1. **00009_category_budgets.sql** - Creates new tables (category_budgets, planned_entries, monthly_snapshots)
2. **00010_migrate_budgets.sql** - Migrates existing budget_items to category_budgets
3. **00012_improve_budget_migration.sql** - Fixes budget_type preservation

## Migration Steps

### Prerequisites

- Backup your database before running migrations
- Ensure you have the latest code deployed
- Verify migrations are pending:

```bash
goose -dir backend/internal/migrations status
```

### Step 1: Run Migrations

```bash
# Run all pending migrations
goose -dir backend/internal/migrations up

# Or run specific migration
goose -dir backend/internal/migrations up-to 00012
```

### Step 2: Validation

After migration, run the validation queries to ensure data integrity:

```sql
-- Check migration summary
SELECT
    'Budget Items' as source_table,
    COUNT(*) as count
FROM budget_items
UNION ALL
SELECT
    'Category Budgets' as source_table,
    COUNT(*) as count
FROM category_budgets;

-- Verify budget type distribution
SELECT
    budget_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM category_budgets
GROUP BY budget_type
ORDER BY count DESC;

-- Check for missing migrations
SELECT
    b.budget_id,
    b.name,
    b.month,
    b.year,
    b.budget_type,
    bi.category_id,
    bi.planned_amount
FROM budget_items bi
INNER JOIN budgets b ON bi.budget_id = b.budget_id
LEFT JOIN category_budgets cb ON (
    cb.user_id = b.user_id
    AND cb.organization_id = b.organization_id
    AND cb.category_id = bi.category_id
    AND cb.month = b.month
    AND cb.year = b.year
)
WHERE cb.category_budget_id IS NULL;
-- Should return 0 rows
```

### Step 3: Verify Budget Type Preservation

```sql
-- Verify budget types match between old and new systems
SELECT
    b.budget_type as old_budget_type,
    cb.budget_type as new_budget_type,
    COUNT(*) as count
FROM budget_items bi
INNER JOIN budgets b ON bi.budget_id = b.budget_id
INNER JOIN category_budgets cb ON (
    cb.user_id = b.user_id
    AND cb.organization_id = b.organization_id
    AND cb.category_id = bi.category_id
    AND cb.month = b.month
    AND cb.year = b.year
)
GROUP BY b.budget_type, cb.budget_type
ORDER BY count DESC;

-- Expected output: All rows should have matching budget types
-- old_budget_type | new_budget_type | count
-- fixed           | fixed           | X
-- calculated      | calculated      | Y
-- maior           | maior           | Z
```

## Migration Details

### 00009_category_budgets.sql

Creates three new tables:

- **category_budgets**: Per-category monthly budgets (replaces budget_items)
- **planned_entries**: Recurrent and one-time planned transactions
- **monthly_snapshots**: Historical budget data for reporting

### 00010_migrate_budgets.sql

Migrates data from budget_items to category_budgets:

- Copies all budget items
- Preserves amounts, dates, and user associations
- **Initial Limitation**: Sets all budget_type to 'fixed' (corrected in 00012)
- Idempotent: Safe to run multiple times

### 00012_improve_budget_migration.sql

Fixes budget_type preservation:

- Updates category_budgets to use parent budget's budget_type
- Only affects records that were defaulted to 'fixed'
- Provides detailed reporting of budget type distribution

## Data Mapping

### Old System → New System

```
budgets table
├── budget_id (1)
├── name: "January Budget"
├── month: 1
├── year: 2024
├── budget_type: "calculated"
└── budget_items (child)
    ├── category_id: 5
    └── planned_amount: 1000

                ↓ MIGRATION ↓

category_budgets table
├── category_budget_id (auto)
├── category_id: 5
├── month: 1
├── year: 2024
├── budget_type: "calculated"  ✅ Preserved from parent
└── planned_amount: 1000
```

## Rollback Procedure

If you need to rollback:

```bash
# Rollback specific migration
goose -dir backend/internal/migrations down

# Or rollback to specific version
goose -dir backend/internal/migrations down-to 00009
```

**Note**: Rollback removes migrated data from category_budgets but keeps budget_items intact.

## Common Issues

### Issue: Category budgets not created

**Symptoms**: category_budgets table is empty after migration

**Causes**:
- No budget_items exist in old system
- User/organization constraints failing

**Resolution**:
```sql
-- Check if budget_items exist
SELECT COUNT(*) FROM budget_items;

-- Check for constraint violations
SELECT
    b.user_id,
    b.organization_id,
    COUNT(*) as budget_count
FROM budgets b
LEFT JOIN user_organizations uo ON (
    uo.user_id = b.user_id
    AND uo.organization_id = b.organization_id
)
WHERE uo.user_id IS NULL
GROUP BY b.user_id, b.organization_id;
```

### Issue: Budget types all show as 'fixed'

**Symptoms**: All category_budgets have budget_type = 'fixed' regardless of original type

**Cause**: Migration 00012 not run yet

**Resolution**:
```bash
# Run the budget type fix migration
goose -dir backend/internal/migrations up-to 00012
```

### Issue: Duplicate category budgets

**Symptoms**: Error about unique constraint violation

**Cause**: Migration run multiple times without proper idempotency check

**Resolution**:
```sql
-- Find duplicates
SELECT
    user_id,
    organization_id,
    category_id,
    month,
    year,
    COUNT(*) as count
FROM category_budgets
GROUP BY user_id, organization_id, category_id, month, year
HAVING COUNT(*) > 1;

-- Keep the latest record, delete older ones
DELETE FROM category_budgets cb1
WHERE EXISTS (
    SELECT 1 FROM category_budgets cb2
    WHERE cb1.user_id = cb2.user_id
      AND cb1.organization_id = cb2.organization_id
      AND cb1.category_id = cb2.category_id
      AND cb1.month = cb2.month
      AND cb1.year = cb2.year
      AND cb1.category_budget_id < cb2.category_budget_id
);
```

## Post-Migration

### Deprecation Timeline

After successful migration:

1. **Week 1-2**: Monitor for issues, both systems run in parallel
2. **Week 3-4**: Gradual transition to new system
3. **Month 2**: Deprecate old budget_items endpoints
4. **Month 3**: Archive old budgets/budget_items tables

### Old Tables

The old `budgets` and `budget_items` tables remain in the database for:

- Rollback capability
- Historical reference
- Data validation

**Do not drop these tables** until you've confirmed:
- ✅ All data migrated correctly
- ✅ New system working in production
- ✅ Users adapted to new UI
- ✅ Backup completed

## Support

If you encounter issues during migration:

1. Check the validation queries above
2. Review migration logs: `goose -dir backend/internal/migrations status`
3. Consult this guide's troubleshooting section
4. Contact the development team with:
   - Migration step where error occurred
   - Error message
   - Database state (row counts, constraint violations)
