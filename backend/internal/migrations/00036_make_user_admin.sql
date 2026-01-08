-- +goose Up
-- Set user_id 3 as admin in their organization
UPDATE user_organizations
SET user_role = 'admin'
WHERE user_id = 3;

-- +goose Down
-- Revert to regular_manager
UPDATE user_organizations
SET user_role = 'regular_manager'
WHERE user_id = 3;
