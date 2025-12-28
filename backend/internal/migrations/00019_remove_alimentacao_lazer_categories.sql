-- +goose Up
-- Remove system categories "Alimentação" and "Lazer"

-- First, set category_id to NULL for any transactions using these categories
UPDATE transactions
SET category_id = NULL
WHERE category_id IN (
    SELECT category_id FROM categories WHERE name IN ('Alimentação', 'Lazer')
);

-- Remove any budget items referencing these categories
DELETE FROM budget_items
WHERE category_id IN (
    SELECT category_id FROM categories WHERE name IN ('Alimentação', 'Lazer')
);

-- Remove any category budgets referencing these categories
DELETE FROM category_budgets
WHERE category_id IN (
    SELECT category_id FROM categories WHERE name IN ('Alimentação', 'Lazer')
);

-- Remove any patterns referencing these categories
DELETE FROM patterns
WHERE target_category_id IN (
    SELECT category_id FROM categories WHERE name IN ('Alimentação', 'Lazer')
);

-- Remove any planned entries referencing these categories
DELETE FROM planned_entry_statuses
WHERE planned_entry_id IN (
    SELECT planned_entry_id FROM planned_entries WHERE category_id IN (
        SELECT category_id FROM categories WHERE name IN ('Alimentação', 'Lazer')
    )
);

DELETE FROM planned_entries
WHERE category_id IN (
    SELECT category_id FROM categories WHERE name IN ('Alimentação', 'Lazer')
);

-- Finally, delete the categories
DELETE FROM categories WHERE name IN ('Alimentação', 'Lazer');

-- +goose Down
-- Re-add the system categories
INSERT INTO categories (name, icon, is_system, user_id, color) VALUES
('Alimentação', '🍔', true, NULL, '#F59E0B'),
('Lazer', '🎮', true, NULL, '#EC4899');
