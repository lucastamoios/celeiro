-- +goose Up
-- Prevent duplicate planned entries per savings goal per month.
-- Uses created_at month/year since planned entries don't have explicit month/year columns.
-- We create a partial unique index on (savings_goal_id, date_trunc('month', created_at))
-- only for non-recurrent entries with a savings_goal_id.
CREATE UNIQUE INDEX idx_planned_entries_goal_month
ON planned_entries (savings_goal_id, date_trunc('month', created_at))
WHERE savings_goal_id IS NOT NULL AND is_recurrent = false;

-- +goose Down
DROP INDEX IF EXISTS idx_planned_entries_goal_month;
