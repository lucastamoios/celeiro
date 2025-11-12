-- +goose Up
-- +goose StatementBegin
-- Improved budget migration: Preserve budget_type from original budgets
-- This migration updates the category_budgets table to use the correct budget_type
-- from the parent budget instead of defaulting everything to 'fixed'

-- Update existing category budgets to use the parent budget's type
UPDATE category_budgets cb
SET budget_type = b.budget_type,
    updated_at = CURRENT_TIMESTAMP
FROM budget_items bi
INNER JOIN budgets b ON bi.budget_id = b.budget_id
WHERE cb.user_id = b.user_id
  AND cb.organization_id = b.organization_id
  AND cb.category_id = bi.category_id
  AND cb.month = b.month
  AND cb.year = b.year
  AND cb.budget_type = 'fixed'  -- Only update records that were defaulted to fixed
  AND b.budget_type IN ('calculated', 'maior');  -- Only where parent has different type

-- Validation: Report migration results
DO $$
DECLARE
    fixed_count INT;
    calculated_count INT;
    maior_count INT;
    total_count INT;
BEGIN
    SELECT COUNT(*) INTO fixed_count FROM category_budgets WHERE budget_type = 'fixed';
    SELECT COUNT(*) INTO calculated_count FROM category_budgets WHERE budget_type = 'calculated';
    SELECT COUNT(*) INTO maior_count FROM category_budgets WHERE budget_type = 'maior';
    SELECT COUNT(*) INTO total_count FROM category_budgets;

    RAISE NOTICE '=== Budget Type Distribution ===';
    RAISE NOTICE 'Fixed: % (%.1f%%)', fixed_count, (fixed_count::FLOAT / NULLIF(total_count, 0) * 100);
    RAISE NOTICE 'Calculated: % (%.1f%%)', calculated_count, (calculated_count::FLOAT / NULLIF(total_count, 0) * 100);
    RAISE NOTICE 'Maior: % (%.1f%%)', maior_count, (maior_count::FLOAT / NULLIF(total_count, 0) * 100);
    RAISE NOTICE 'Total: %', total_count;
    RAISE NOTICE '================================';
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Revert category budgets back to fixed type
UPDATE category_budgets cb
SET budget_type = 'fixed',
    updated_at = CURRENT_TIMESTAMP
FROM budget_items bi
INNER JOIN budgets b ON bi.budget_id = b.budget_id
WHERE cb.user_id = b.user_id
  AND cb.organization_id = b.organization_id
  AND cb.category_id = bi.category_id
  AND cb.month = b.month
  AND cb.year = b.year
  AND cb.budget_type IN ('calculated', 'maior');

RAISE NOTICE 'Rollback complete: category budgets reverted to fixed type';
-- +goose StatementEnd
