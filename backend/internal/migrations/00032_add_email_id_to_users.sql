-- +goose Up
-- Add email_id column for email-based OFX imports
ALTER TABLE users ADD COLUMN email_id VARCHAR(50);

-- Generate unique email_ids for existing users using a short hash
-- For lucas.tamoios@gmail.com, use a friendly ID
UPDATE users SET email_id = 'ofx+lucas.tamoios' WHERE email = 'lucas.tamoios@gmail.com';

-- For all other users, generate a short unique ID based on user_id
UPDATE users SET email_id = 'u' || encode(sha256(('celeiro-' || user_id::text)::bytea), 'hex')::varchar(12)
WHERE email_id IS NULL;

-- Make it NOT NULL and UNIQUE after populating
ALTER TABLE users ALTER COLUMN email_id SET NOT NULL;
CREATE UNIQUE INDEX idx_users_email_id ON users(email_id);

-- +goose Down
DROP INDEX IF EXISTS idx_users_email_id;
ALTER TABLE users DROP COLUMN IF EXISTS email_id;
