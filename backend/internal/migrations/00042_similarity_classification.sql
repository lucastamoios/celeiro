-- +goose Up
-- Migration: Add similarity-based auto-categorization support
--
-- Enables pg_trgm for fuzzy matching on original_description,
-- adds fields to track how a transaction was classified and
-- store category suggestions with confidence scores.

-- Step 1: Enable trigram similarity extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Add classification tracking field
-- Values: 'manual', 'pattern', 'planned_entry', 'similarity'
-- NULL for legacy transactions (treated as 'manual')
ALTER TABLE transactions ADD COLUMN classified_by TEXT;

-- Step 3: Add suggestion fields for ambiguous/low-confidence matches
ALTER TABLE transactions ADD COLUMN suggested_category_id INT
    REFERENCES categories(category_id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN suggested_description TEXT;
ALTER TABLE transactions ADD COLUMN suggestion_confidence DECIMAL(4,3)
    CHECK (suggestion_confidence IS NULL OR (suggestion_confidence >= 0 AND suggestion_confidence <= 1));

-- Step 4: GIN index for fast trigram similarity lookups
CREATE INDEX idx_transactions_original_desc_trgm
    ON transactions USING gin (original_description gin_trgm_ops);

-- Step 5: Backfill classified_by for pattern-matched transactions
UPDATE transactions SET classified_by = 'pattern'
    WHERE classification_rule_id IS NOT NULL AND classified_by IS NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_transactions_original_desc_trgm;
ALTER TABLE transactions DROP COLUMN IF EXISTS suggestion_confidence;
ALTER TABLE transactions DROP COLUMN IF EXISTS suggested_description;
ALTER TABLE transactions DROP COLUMN IF EXISTS suggested_category_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS classified_by;
-- Note: We don't drop pg_trgm as other things may depend on it
