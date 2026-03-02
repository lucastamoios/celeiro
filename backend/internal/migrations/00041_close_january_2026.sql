-- +goose Up
-- Data migration: Close January 2026
-- Consolidates all January 2026 category budgets and creates the carry-over
-- transaction (Saldo anterior) for February 2026.

-- Step 1: Create monthly_snapshots for unconsolidated January 2026 budgets
INSERT INTO monthly_snapshots (
    user_id,
    organization_id,
    category_id,
    month,
    year,
    planned_amount,
    actual_amount,
    variance_percent,
    budget_type
)
SELECT
    cb.user_id,
    cb.organization_id,
    cb.category_id,
    1   AS month,
    2026 AS year,
    cb.controlled_amount + COALESCE(pe_sums.planned_amount, 0) AS planned_amount,
    COALESCE(actual.total_spent, 0)                            AS actual_amount,
    CASE
        WHEN (cb.controlled_amount + COALESCE(pe_sums.planned_amount, 0)) > 0 THEN
            LEAST(999.99, GREATEST(-999.99, ROUND(
                (COALESCE(actual.total_spent, 0) - (cb.controlled_amount + COALESCE(pe_sums.planned_amount, 0)))
                / (cb.controlled_amount + COALESCE(pe_sums.planned_amount, 0)) * 100,
                2
            )))
        ELSE 0
    END AS variance_percent,
    'controlled' AS budget_type
FROM category_budgets cb
LEFT JOIN (
    SELECT
        organization_id,
        category_id,
        COALESCE(SUM(amount), 0) AS planned_amount
    FROM planned_entries
    WHERE is_active = true
        AND is_recurrent = true
        AND entry_type = 'expense'
    GROUP BY organization_id, category_id
) pe_sums ON pe_sums.category_id = cb.category_id
    AND pe_sums.organization_id = cb.organization_id
LEFT JOIN (
    SELECT
        a.organization_id,
        t.category_id,
        COALESCE(SUM(ABS(t.amount)), 0) AS total_spent
    FROM transactions t
    INNER JOIN accounts a ON a.account_id = t.account_id
    WHERE t.category_id IS NOT NULL
        AND EXTRACT(MONTH FROM t.transaction_date) = 1
        AND EXTRACT(YEAR  FROM t.transaction_date) = 2026
        AND t.transaction_type = 'debit'
        AND t.is_ignored = false
    GROUP BY a.organization_id, t.category_id
) actual ON actual.category_id = cb.category_id
    AND actual.organization_id = cb.organization_id
WHERE cb.month = 1
    AND cb.year = 2026
    AND cb.is_consolidated = false
ON CONFLICT (user_id, organization_id, category_id, month, year) DO NOTHING;

-- Step 2: Mark all January 2026 category budgets as consolidated
UPDATE category_budgets
SET is_consolidated  = true,
    consolidated_at  = NOW()
WHERE month = 1
    AND year  = 2026
    AND is_consolidated = false;

-- Step 3: Create carry-over transaction for February 2026
-- surplus = total_income - total_spending across all transactions in January 2026.
-- Inserted into the first active checking account per organization (falls back to
-- first active account if no checking account exists).
-- Idempotent via ON CONFLICT on (account_id, ofx_fitid).
WITH jan_surplus AS (
    SELECT
        a.organization_id,
        SUM(CASE WHEN t.transaction_type = 'credit' AND NOT t.is_ignored THEN t.amount ELSE 0 END)
        - SUM(CASE WHEN t.transaction_type = 'debit'  AND NOT t.is_ignored THEN t.amount ELSE 0 END)
        AS surplus
    FROM transactions t
    INNER JOIN accounts a ON a.account_id = t.account_id
    WHERE EXTRACT(MONTH FROM t.transaction_date) = 1
        AND EXTRACT(YEAR  FROM t.transaction_date) = 2026
    GROUP BY a.organization_id
),
first_account AS (
    SELECT DISTINCT ON (organization_id)
        organization_id,
        account_id
    FROM accounts
    WHERE is_active = true
    ORDER BY organization_id,
             CASE WHEN account_type = 'checking' THEN 0 ELSE 1 END,
             created_at DESC
)
INSERT INTO transactions (
    account_id,
    description,
    original_description,
    amount,
    transaction_date,
    transaction_type,
    ofx_fitid
)
SELECT
    fa.account_id,
    'Saldo anterior - Janeiro/2026',
    'Saldo anterior - Janeiro/2026',
    ABS(js.surplus),
    '2026-02-01',
    CASE WHEN js.surplus >= 0 THEN 'credit' ELSE 'debit' END,
    'CARRYOVER-2026-01'
FROM jan_surplus js
INNER JOIN first_account fa ON fa.organization_id = js.organization_id
WHERE js.surplus <> 0
ON CONFLICT (account_id, ofx_fitid) WHERE ofx_fitid IS NOT NULL
DO UPDATE SET
    amount           = EXCLUDED.amount,
    transaction_type = EXCLUDED.transaction_type,
    transaction_date = EXCLUDED.transaction_date,
    updated_at       = NOW();

-- +goose Down
-- Partial rollback: removes the carry-over transaction and un-consolidates January 2026 budgets.
-- Note: monthly_snapshots created by this migration cannot be safely removed without
-- knowing which ones existed before. They are left in place on rollback.

DELETE FROM transactions
WHERE ofx_fitid = 'CARRYOVER-2026-01';

UPDATE category_budgets
SET is_consolidated = false,
    consolidated_at = NULL
WHERE month = 1
    AND year  = 2026;
