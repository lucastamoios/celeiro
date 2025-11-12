-- +goose Up
-- +goose StatementBegin
-- Rename budget_type value from 'hybrid' to 'maior'
UPDATE budgets
SET budget_type = 'maior'
WHERE budget_type = 'hybrid';

-- Update check constraint if it exists (PostgreSQL)
-- Note: This assumes the constraint name. Adjust if different.
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_budget_type_check;
ALTER TABLE budgets ADD CONSTRAINT budgets_budget_type_check
    CHECK (budget_type IN ('fixed', 'calculated', 'maior'));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Revert budget_type value from 'maior' back to 'hybrid'
UPDATE budgets
SET budget_type = 'hybrid'
WHERE budget_type = 'maior';

-- Restore original constraint
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_budget_type_check;
ALTER TABLE budgets ADD CONSTRAINT budgets_budget_type_check
    CHECK (budget_type IN ('fixed', 'calculated', 'hybrid'));
-- +goose StatementEnd
