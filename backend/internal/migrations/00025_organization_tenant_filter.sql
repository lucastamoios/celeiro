-- +goose Up

-- Add organization_id to categories table to enable organization-based filtering
-- This allows multiple users in the same organization (e.g., family members) to share categories
ALTER TABLE categories ADD COLUMN organization_id INT REFERENCES organizations(organization_id);

-- Backfill organization_id from user's organization (for non-system categories)
UPDATE categories c
SET organization_id = (
    SELECT uo.organization_id
    FROM user_organizations uo
    WHERE uo.user_id = c.user_id
    LIMIT 1
)
WHERE c.user_id IS NOT NULL AND c.is_system = false;

-- Create index for efficient organization-based queries
CREATE INDEX idx_categories_organization_id ON categories(organization_id);

-- +goose Down
DROP INDEX IF EXISTS idx_categories_organization_id;
ALTER TABLE categories DROP COLUMN organization_id;
