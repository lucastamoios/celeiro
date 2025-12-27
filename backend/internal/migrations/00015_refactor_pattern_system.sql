-- +goose Up
-- Migration: Refactor Pattern System
-- 1. Add original_description to transactions
-- 2. Rename advanced_patterns to patterns
-- 3. Remove is_saved_pattern from planned_entries
-- 4. Drop unused classification_rules table

-- Step 1: Add original_description column to transactions
ALTER TABLE transactions 
ADD COLUMN original_description TEXT;

-- Step 2: Populate original_description from existing description for all transactions
-- This preserves the OFX description before any user edits
UPDATE transactions 
SET original_description = description 
WHERE original_description IS NULL;

-- Step 3: Make original_description NOT NULL for future inserts
-- (We can't enforce this with ALTER TABLE since existing rows need the update first)
-- This will be enforced at application level

-- Step 4: Rename advanced_patterns table to patterns
ALTER TABLE advanced_patterns RENAME TO patterns;

-- Step 5: Rename indexes for patterns table
ALTER INDEX idx_advanced_patterns_user_org RENAME TO idx_patterns_user_org;
ALTER INDEX idx_advanced_patterns_active RENAME TO idx_patterns_active;
ALTER INDEX idx_advanced_patterns_category RENAME TO idx_patterns_category;

-- Step 6: Remove is_saved_pattern column from planned_entries
-- First, delete any orphaned saved patterns (they will be replaced by regex patterns)
DELETE FROM planned_entries WHERE is_saved_pattern = TRUE;

-- Then drop the column
ALTER TABLE planned_entries DROP COLUMN IF EXISTS is_saved_pattern;

-- Step 7: Drop the old classification_rules table (superseded by patterns)
DROP TABLE IF EXISTS classification_rules CASCADE;

-- Step 8: Add index on original_description for pattern matching performance
CREATE INDEX idx_transactions_original_description ON transactions USING gin(to_tsvector('portuguese', original_description));

-- +goose Down
-- Reverse all changes

-- Drop the text search index
DROP INDEX IF EXISTS idx_transactions_original_description;

-- Recreate classification_rules table
CREATE TABLE classification_rules (
    rule_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(category_id),
    name VARCHAR(255) NOT NULL,
    priority INT NOT NULL DEFAULT 100,
    match_description VARCHAR(500),
    match_amount_min DECIMAL(15, 2),
    match_amount_max DECIMAL(15, 2),
    match_transaction_type VARCHAR(20),
    is_active BOOLEAN DEFAULT true
);
CREATE INDEX idx_classification_rules_user_id ON classification_rules(user_id);
CREATE INDEX idx_classification_rules_category_id ON classification_rules(category_id);
CREATE INDEX idx_classification_rules_priority ON classification_rules(user_id, priority ASC, created_at ASC)
WHERE is_active = true;

-- Re-add is_saved_pattern to planned_entries
ALTER TABLE planned_entries ADD COLUMN is_saved_pattern BOOLEAN NOT NULL DEFAULT FALSE;

-- Rename patterns back to advanced_patterns
ALTER INDEX idx_patterns_user_org RENAME TO idx_advanced_patterns_user_org;
ALTER INDEX idx_patterns_active RENAME TO idx_advanced_patterns_active;
ALTER INDEX idx_patterns_category RENAME TO idx_advanced_patterns_category;
ALTER TABLE patterns RENAME TO advanced_patterns;

-- Remove original_description column
ALTER TABLE transactions DROP COLUMN IF EXISTS original_description;

