-- +goose Up
-- Add password_hash column to support email+password authentication alongside magic link
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
