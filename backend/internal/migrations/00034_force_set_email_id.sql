-- +goose Up
-- Force set email_id for all users

-- First, set for the known user
UPDATE users SET email_id = 'ofx+lucas.tamoios' WHERE user_id = 3;

-- Set for any other users that don't have it
UPDATE users SET email_id = 'u' || LEFT(encode(sha256(('celeiro-' || user_id::text)::bytea), 'hex'), 12)
WHERE user_id != 3 AND (email_id IS NULL OR email_id = '');

-- +goose Down
-- No rollback needed
