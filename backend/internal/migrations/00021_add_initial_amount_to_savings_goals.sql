-- +goose Up
-- Add initial_amount column to savings_goals for pre-existing balances

ALTER TABLE savings_goals
ADD COLUMN initial_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (initial_amount >= 0);

COMMENT ON COLUMN savings_goals.initial_amount IS 'Initial balance already saved toward this goal before tracking started';

-- +goose Down
ALTER TABLE savings_goals DROP COLUMN IF EXISTS initial_amount;
