-- +goose Up
-- Fix email_id values that were not properly populated

-- For lucas.tamoios@gmail.com, use a friendly ID
UPDATE users SET email_id = 'ofx+lucas.tamoios'
WHERE email = 'lucas.tamoios@gmail.com' AND (email_id IS NULL OR email_id = '');

-- For all other users, generate a short unique ID based on user_id
UPDATE users SET email_id = 'u' || LEFT(encode(sha256(('celeiro-' || user_id::text)::bytea), 'hex'), 12)
WHERE email_id IS NULL OR email_id = '';

-- +goose Down
-- No rollback needed for data fix
