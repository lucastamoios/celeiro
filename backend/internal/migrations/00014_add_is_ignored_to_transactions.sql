-- +goose Up
-- Add is_ignored column to transactions table to support ignoring transactions
ALTER TABLE transactions
ADD COLUMN is_ignored BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for faster queries filtering by ignored status
CREATE INDEX idx_transactions_is_ignored ON transactions(is_ignored);

-- +goose Down
DROP INDEX IF EXISTS idx_transactions_is_ignored;
ALTER TABLE transactions DROP COLUMN IF EXISTS is_ignored;
