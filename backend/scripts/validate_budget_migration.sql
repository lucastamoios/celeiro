-- Budget Migration Validation Script
-- Run this script to validate the budget migration is successful

\echo '==================================================================='
\echo 'Budget Migration Validation Report'
\echo '==================================================================='
\echo ''

-- 1. Check table existence
\echo '1. TABLE EXISTENCE CHECK'
\echo '-------------------------------------------------------------------'
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN '✅'
        ELSE '❌'
    END || ' budgets table exists' as check_result
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budget_items') THEN '✅'
        ELSE '❌'
    END || ' budget_items table exists'
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'category_budgets') THEN '✅'
        ELSE '❌'
    END || ' category_budgets table exists'
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planned_entries') THEN '✅'
        ELSE '❌'
    END || ' planned_entries table exists'
UNION ALL
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_snapshots') THEN '✅'
        ELSE '❌'
    END || ' monthly_snapshots table exists';

\echo ''
\echo '2. ROW COUNT SUMMARY'
\echo '-------------------------------------------------------------------'

SELECT
    'budgets' as table_name,
    COUNT(*) as row_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Has data'
        ELSE '⚠️  Empty'
    END as status
FROM budgets
UNION ALL
SELECT
    'budget_items',
    COUNT(*),
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Has data'
        ELSE '⚠️  Empty'
    END
FROM budget_items
UNION ALL
SELECT
    'category_budgets',
    COUNT(*),
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Has data'
        WHEN (SELECT COUNT(*) FROM budget_items) = 0 THEN '✅ Empty (no source data)'
        ELSE '❌ Empty but should have data'
    END
FROM category_budgets
UNION ALL
SELECT
    'planned_entries',
    COUNT(*),
    CASE
        WHEN COUNT(*) >= 0 THEN '✅ OK'
    END
FROM planned_entries
UNION ALL
SELECT
    'monthly_snapshots',
    COUNT(*),
    CASE
        WHEN COUNT(*) >= 0 THEN '✅ OK'
    END
FROM monthly_snapshots
ORDER BY table_name;

\echo ''
\echo '3. MIGRATION COMPLETENESS'
\echo '-------------------------------------------------------------------'

-- Check if all budget_items have been migrated
WITH migration_check AS (
    SELECT
        COUNT(DISTINCT bi.budget_item_id) as total_items,
        COUNT(DISTINCT cb.category_budget_id) as migrated_items
    FROM budget_items bi
    LEFT JOIN budgets b ON bi.budget_id = b.budget_id
    LEFT JOIN category_budgets cb ON (
        cb.user_id = b.user_id
        AND cb.organization_id = b.organization_id
        AND cb.category_id = bi.category_id
        AND cb.month = b.month
        AND cb.year = b.year
    )
)
SELECT
    total_items as "Total Budget Items",
    migrated_items as "Migrated to Category Budgets",
    total_items - migrated_items as "Not Migrated",
    CASE
        WHEN total_items = migrated_items THEN '✅ Complete'
        WHEN total_items = 0 THEN '⚠️  No data to migrate'
        ELSE '❌ Incomplete (' || (total_items - migrated_items) || ' missing)'
    END as "Status"
FROM migration_check;

\echo ''
\echo '4. BUDGET TYPE PRESERVATION'
\echo '-------------------------------------------------------------------'

-- Check if budget types were preserved correctly
SELECT
    b.budget_type as "Original Budget Type",
    cb.budget_type as "Migrated Budget Type",
    COUNT(*) as "Count",
    CASE
        WHEN b.budget_type = cb.budget_type THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as "Status"
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
ORDER BY "Count" DESC;

\echo ''
\echo '5. BUDGET TYPE DISTRIBUTION'
\echo '-------------------------------------------------------------------'

SELECT
    budget_type as "Budget Type",
    COUNT(*) as "Count",
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) || '%' as "Percentage"
FROM category_budgets
GROUP BY budget_type
UNION ALL
SELECT
    'TOTAL',
    COUNT(*),
    '100.0%'
FROM category_budgets
ORDER BY "Count" DESC;

\echo ''
\echo '6. DATA INTEGRITY CHECKS'
\echo '-------------------------------------------------------------------'

-- Check for orphaned records
WITH integrity_checks AS (
    SELECT
        'Orphaned category_budgets (no matching budget_item)' as check_name,
        COUNT(*) as issue_count
    FROM category_budgets cb
    LEFT JOIN budget_items bi ON (
        bi.category_id = cb.category_id
    )
    LEFT JOIN budgets b ON (
        bi.budget_id = b.budget_id
        AND b.user_id = cb.user_id
        AND b.organization_id = cb.organization_id
        AND b.month = cb.month
        AND b.year = cb.year
    )
    WHERE b.budget_id IS NULL
    UNION ALL
    SELECT
        'Category budgets with invalid category_id',
        COUNT(*)
    FROM category_budgets cb
    LEFT JOIN categories c ON c.category_id = cb.category_id
    WHERE c.category_id IS NULL
    UNION ALL
    SELECT
        'Category budgets with negative amounts',
        COUNT(*)
    FROM category_budgets
    WHERE planned_amount < 0
    UNION ALL
    SELECT
        'Duplicate category budgets (same user/org/category/month/year)',
        COUNT(*) - COUNT(DISTINCT (user_id, organization_id, category_id, month, year))
    FROM category_budgets
)
SELECT
    check_name as "Check",
    issue_count as "Issues Found",
    CASE
        WHEN issue_count = 0 THEN '✅ Pass'
        ELSE '❌ FAIL'
    END as "Status"
FROM integrity_checks;

\echo ''
\echo '7. MISSING MIGRATIONS (if any)'
\echo '-------------------------------------------------------------------'

-- Show budget items that haven't been migrated
SELECT
    b.budget_id as "Budget ID",
    b.name as "Budget Name",
    b.month || '/' || b.year as "Period",
    b.budget_type as "Budget Type",
    bi.category_id as "Category ID",
    bi.planned_amount as "Planned Amount"
FROM budget_items bi
INNER JOIN budgets b ON bi.budget_id = b.budget_id
LEFT JOIN category_budgets cb ON (
    cb.user_id = b.user_id
    AND cb.organization_id = b.organization_id
    AND cb.category_id = bi.category_id
    AND cb.month = b.month
    AND cb.year = b.year
)
WHERE cb.category_budget_id IS NULL
LIMIT 10;

-- If no results, show success message
SELECT
    CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM budget_items bi
            INNER JOIN budgets b ON bi.budget_id = b.budget_id
            LEFT JOIN category_budgets cb ON (
                cb.user_id = b.user_id
                AND cb.organization_id = b.organization_id
                AND cb.category_id = bi.category_id
                AND cb.month = b.month
                AND cb.year = b.year
            )
            WHERE cb.category_budget_id IS NULL
        ) THEN '✅ All budget items successfully migrated'
        ELSE '❌ See missing migrations above'
    END as "Result";

\echo ''
\echo '==================================================================='
\echo 'VALIDATION SUMMARY'
\echo '==================================================================='

WITH summary AS (
    SELECT
        COUNT(*) as total_checks,
        SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed_checks
    FROM (
        -- Check 1: category_budgets table exists
        SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'category_budgets') as passed
        UNION ALL
        -- Check 2: Migration completeness
        SELECT
            COALESCE(
                (SELECT COUNT(*) FROM budget_items) =
                (SELECT COUNT(*) FROM category_budgets WHERE EXISTS (SELECT 1 FROM budget_items))
            , true) -- true if no budget_items exist
        UNION ALL
        -- Check 3: No budget type mismatches
        SELECT NOT EXISTS (
            SELECT 1
            FROM budget_items bi
            INNER JOIN budgets b ON bi.budget_id = b.budget_id
            INNER JOIN category_budgets cb ON (
                cb.user_id = b.user_id
                AND cb.organization_id = b.organization_id
                AND cb.category_id = bi.category_id
                AND cb.month = b.month
                AND cb.year = b.year
            )
            WHERE b.budget_type != cb.budget_type
        )
        UNION ALL
        -- Check 4: No negative amounts
        SELECT NOT EXISTS (SELECT 1 FROM category_budgets WHERE planned_amount < 0)
        UNION ALL
        -- Check 5: No duplicates
        SELECT (
            SELECT COUNT(*) FROM category_budgets
        ) = (
            SELECT COUNT(DISTINCT (user_id, organization_id, category_id, month, year))
            FROM category_budgets
        )
    ) checks
)
SELECT
    total_checks || ' total validation checks' as "Checks Performed",
    passed_checks || ' passed' as "Results",
    (total_checks - passed_checks) || ' failed' as "Failures",
    CASE
        WHEN passed_checks = total_checks THEN '✅ MIGRATION SUCCESSFUL'
        ELSE '❌ MIGRATION HAS ISSUES - Review failures above'
    END as "Overall Status"
FROM summary;

\echo ''
\echo 'End of Validation Report'
\echo '==================================================================='
