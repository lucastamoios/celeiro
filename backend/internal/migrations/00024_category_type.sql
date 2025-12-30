-- +goose Up
-- Add category_type to distinguish income vs expense categories
ALTER TABLE categories
ADD COLUMN category_type VARCHAR(20) NOT NULL DEFAULT 'expense'
CHECK (category_type IN ('expense', 'income'));

CREATE INDEX idx_categories_category_type ON categories(category_type);

-- +goose Down
DROP INDEX IF EXISTS idx_categories_category_type;
ALTER TABLE categories DROP COLUMN IF EXISTS category_type;
