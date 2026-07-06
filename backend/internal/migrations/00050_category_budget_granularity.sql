-- Optional expected purchase count for controlled category pacing. When unset,
-- pacing derives it from the previous month's controlled transaction count.

-- +goose Up
ALTER TABLE category_budgets
ADD COLUMN granularity INT;

ALTER TABLE category_budgets
ADD CONSTRAINT chk_category_budgets_granularity
CHECK (granularity IS NULL OR granularity >= 2);

-- +goose Down
ALTER TABLE category_budgets
DROP CONSTRAINT IF EXISTS chk_category_budgets_granularity;

ALTER TABLE category_budgets
DROP COLUMN IF EXISTS granularity;
