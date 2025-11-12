-- +goose Up
-- +goose StatementBegin
-- Migrate existing budget_items to category_budgets
-- This migration is idempotent - safe to run multiple times

-- Insert category budgets from budget items
INSERT INTO category_budgets (
    user_id,
    organization_id,
    category_id,
    month,
    year,
    budget_type,
    planned_amount,
    is_consolidated,
    created_at,
    updated_at
)
SELECT
    b.user_id,
    b.organization_id,
    bi.category_id,
    b.month,
    b.year,
    'fixed' as budget_type,  -- Default all to fixed
    bi.planned_amount,
    FALSE as is_consolidated,
    bi.created_at,
    bi.updated_at
FROM budget_items bi
INNER JOIN budgets b ON bi.budget_id = b.budget_id
WHERE NOT EXISTS (
    -- Ensure idempotency: only insert if not already exists
    SELECT 1 FROM category_budgets cb
    WHERE cb.user_id = b.user_id
      AND cb.organization_id = b.organization_id
      AND cb.category_id = bi.category_id
      AND cb.month = b.month
      AND cb.year = b.year
);

-- Validation: Log migration results
DO $$
DECLARE
    budget_items_count INT;
    category_budgets_count INT;
BEGIN
    SELECT COUNT(*) INTO budget_items_count FROM budget_items;
    SELECT COUNT(*) INTO category_budgets_count FROM category_budgets;

    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '  - Budget items: %', budget_items_count;
    RAISE NOTICE '  - Category budgets: %', category_budgets_count;

    IF category_budgets_count = 0 AND budget_items_count > 0 THEN
        RAISE WARNING 'No category budgets created but budget items exist. Check migration logic.';
    END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Remove migrated category budgets
-- Only delete category budgets that were created from the old budget_items
DELETE FROM category_budgets
WHERE (user_id, organization_id, category_id, month, year) IN (
    SELECT
        b.user_id,
        b.organization_id,
        bi.category_id,
        b.month,
        b.year
    FROM budget_items bi
    INNER JOIN budgets b ON bi.budget_id = b.budget_id
);

RAISE NOTICE 'Rollback complete: migrated category budgets removed';
-- +goose StatementEnd
