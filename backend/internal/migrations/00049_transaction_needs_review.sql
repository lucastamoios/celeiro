-- Mark transactions that need another person to add more context in the
-- companion app.

-- +goose Up
ALTER TABLE transactions
ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_transactions_needs_review
ON transactions (needs_review)
WHERE needs_review = TRUE;

-- +goose Down
DROP INDEX IF EXISTS idx_transactions_needs_review;

ALTER TABLE transactions
DROP COLUMN IF EXISTS needs_review;
