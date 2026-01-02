-- +goose Up
-- Add system categories for month consolidation carryover
-- When a month is consolidated:
--   - Positive balance → "Receita" (income) entry for next month
--   - Negative balance → "Dívida" (expense) entry for next month

-- First, check if user-created categories exist and convert them to system categories
-- This prevents duplicates and preserves existing data relationships

-- Convert existing "Receita" user category to system category (if exists)
UPDATE categories
SET is_system = true, user_id = NULL, organization_id = NULL, category_type = 'income'
WHERE LOWER(name) = 'receita' AND is_system = false;

-- Convert existing "Dívida" or "Dívidas" user category to system category (if exists)
UPDATE categories
SET is_system = true, user_id = NULL, organization_id = NULL, category_type = 'expense', name = 'Dívida'
WHERE LOWER(name) IN ('dívida', 'dívidas', 'divida', 'dividas') AND is_system = false;

-- Insert "Receita" if it doesn't exist
INSERT INTO categories (name, icon, color, is_system, user_id, organization_id, category_type)
SELECT 'Receita', '💰', '#22C55E', true, NULL, NULL, 'income'
WHERE NOT EXISTS (
    SELECT 1 FROM categories WHERE LOWER(name) = 'receita' AND is_system = true
);

-- Insert "Dívida" if it doesn't exist
INSERT INTO categories (name, icon, color, is_system, user_id, organization_id, category_type)
SELECT 'Dívida', '💳', '#EF4444', true, NULL, NULL, 'expense'
WHERE NOT EXISTS (
    SELECT 1 FROM categories WHERE LOWER(name) = 'dívida' AND is_system = true
);

-- +goose Down
-- Revert system categories back to user categories (soft revert - preserves data)
UPDATE categories
SET is_system = false
WHERE name IN ('Receita', 'Dívida') AND is_system = true;
