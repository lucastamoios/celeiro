-- +goose Up
-- Backfill original_description for transactions that don't have it
-- This is important for pattern matching to work correctly
UPDATE transactions
SET original_description = description
WHERE original_description IS NULL OR original_description = '';

-- +goose Down
-- This migration cannot be reversed as we don't know which original_description values were backfilled
-- and which were already present

