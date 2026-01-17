-- +goose Up
-- Add is_controllable flag to categories for budget pacing feature
-- Controllable categories show pacing information on the dashboard

ALTER TABLE categories ADD COLUMN is_controllable BOOLEAN DEFAULT FALSE;

-- Create index for efficient filtering of controllable categories
CREATE INDEX idx_categories_is_controllable ON categories(is_controllable) WHERE is_controllable = TRUE;

-- +goose Down
DROP INDEX IF EXISTS idx_categories_is_controllable;
ALTER TABLE categories DROP COLUMN IF EXISTS is_controllable;
