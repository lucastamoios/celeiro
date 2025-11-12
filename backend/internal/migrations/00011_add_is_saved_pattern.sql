-- +goose Up
-- Add is_saved_pattern column to planned_entries for pattern management
ALTER TABLE planned_entries
ADD COLUMN is_saved_pattern BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for filtering patterns
CREATE INDEX idx_planned_entries_is_saved_pattern ON planned_entries(is_saved_pattern);

-- +goose Down
-- Remove is_saved_pattern column
DROP INDEX IF EXISTS idx_planned_entries_is_saved_pattern;

ALTER TABLE planned_entries
DROP COLUMN IF EXISTS is_saved_pattern;
