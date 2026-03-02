-- +goose Up
-- Migration: Replace budget_type with controlled_amount model
-- 
-- Old model: budget_type (fixed/calculated/maior) + planned_amount
-- New model: controlled_amount (discretionary buffer) + sum of planned entries
--
-- Total Budget = sum(planned_entries) + controlled_amount

-- Step 1: Add controlled_amount column
ALTER TABLE category_budgets
ADD COLUMN controlled_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (controlled_amount >= 0);

-- Step 2: Migrate data based on existing budget_type
-- For 'fixed' and 'maior': controlled = MAX(0, planned_amount - sum of planned entries)
-- For 'calculated': controlled = 0 (already the default)
WITH direct_entry_sums AS (
    SELECT
        pe.category_id,
        cb.month,
        cb.year,
        pe.user_id,
        pe.organization_id,
        COALESCE(SUM(pe.amount), 0) AS entry_sum
    FROM planned_entries pe
    CROSS JOIN (SELECT DISTINCT month, year FROM category_budgets) cb
    WHERE pe.is_active = true
        AND pe.entry_type = 'expense'
    GROUP BY pe.category_id, cb.month, cb.year, pe.user_id, pe.organization_id
)
UPDATE category_budgets cb
SET controlled_amount = GREATEST(0, 
    cb.planned_amount - COALESCE(
        (SELECT des.entry_sum 
         FROM direct_entry_sums des 
         WHERE des.category_id = cb.category_id 
           AND des.month = cb.month 
           AND des.year = cb.year
           AND des.user_id = cb.user_id
           AND des.organization_id = cb.organization_id),
        0
    )
)
WHERE cb.budget_type IN ('fixed', 'maior');

-- Step 3: Drop budget_type column (no longer needed)
ALTER TABLE category_budgets DROP COLUMN budget_type;

-- Step 4: Drop planned_amount column
ALTER TABLE category_budgets DROP COLUMN planned_amount;

-- +goose Down
-- Restore the old schema

-- Add back planned_amount
ALTER TABLE category_budgets
ADD COLUMN planned_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (planned_amount >= 0);

-- Add back budget_type
ALTER TABLE category_budgets
ADD COLUMN budget_type VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (budget_type IN ('fixed', 'calculated', 'maior'));

UPDATE category_budgets
SET planned_amount = controlled_amount,
    budget_type = CASE WHEN controlled_amount > 0 THEN 'maior' ELSE 'calculated' END;

-- Drop controlled_amount
ALTER TABLE category_budgets DROP COLUMN controlled_amount;
