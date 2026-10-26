-- +goose Up
-- Track which budget month a non-recurrent planned entry belongs to.
-- Used by savings goal auto-generated entries to know their target month.
ALTER TABLE planned_entries ADD COLUMN target_month INT;
ALTER TABLE planned_entries ADD COLUMN target_year INT;

-- Drop the old unique index that used created_at (unreliable)
DROP INDEX IF EXISTS idx_planned_entries_goal_month;

-- New unique index using target_month/target_year
CREATE UNIQUE INDEX idx_planned_entries_goal_month
ON planned_entries (savings_goal_id, target_month, target_year)
WHERE savings_goal_id IS NOT NULL AND is_recurrent = false AND target_month IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_planned_entries_goal_month;
ALTER TABLE planned_entries DROP COLUMN IF EXISTS target_year;
ALTER TABLE planned_entries DROP COLUMN IF EXISTS target_month;
