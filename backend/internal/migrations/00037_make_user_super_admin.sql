-- +goose Up
-- Upgrade user_id 3 to super_admin for backoffice access
UPDATE user_organizations
SET user_role = 'super_admin'
WHERE user_id = 3;

-- +goose Down
-- Revert to admin
UPDATE user_organizations
SET user_role = 'admin'
WHERE user_id = 3;
