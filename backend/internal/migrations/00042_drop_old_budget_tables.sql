-- +goose Up
DROP TABLE IF EXISTS budget_items;
DROP TABLE IF EXISTS budgets;

-- +goose Down
-- Old tables intentionally not recreated
