-- +goose Up
-- +goose StatementBegin
ALTER TABLE user_organizations ADD COLUMN is_default BOOLEAN DEFAULT FALSE;

-- Partial unique index: only one default per user
CREATE UNIQUE INDEX idx_user_organizations_default
ON user_organizations(user_id) WHERE is_default = TRUE;

-- Set first organization as default for existing users
UPDATE user_organizations uo1
SET is_default = TRUE
WHERE user_organization_id = (
    SELECT MIN(user_organization_id)
    FROM user_organizations uo2
    WHERE uo2.user_id = uo1.user_id
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_user_organizations_default;
ALTER TABLE user_organizations DROP COLUMN IF EXISTS is_default;
-- +goose StatementEnd
