-- +goose Up
ALTER TABLE users
ADD COLUMN email_verified_at TIMESTAMP NULL;

-- Existing users predate verification and must keep access.
UPDATE users
SET email_verified_at = CURRENT_TIMESTAMP
WHERE email_verified_at IS NULL;

-- +goose Down
ALTER TABLE users
DROP COLUMN IF EXISTS email_verified_at;
