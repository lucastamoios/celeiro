-- +goose Up
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    name VARCHAR(255) NOT NULL,
    icon VARCHAR(10) DEFAULT '📦',
    is_system BOOLEAN DEFAULT false,
    user_id INT REFERENCES users(user_id)
);

-- Index for filtering by user and system categories
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_is_system ON categories(is_system);

-- Seed 7 system categories (global, user_id = NULL)
INSERT INTO categories (name, icon, is_system, user_id) VALUES
('Alimentação', '🍔', true, NULL),
('Transporte', '🚗', true, NULL),
('Moradia', '🏠', true, NULL),
('Saúde', '💊', true, NULL),
('Educação', '📚', true, NULL),
('Lazer', '🎮', true, NULL),
('Outros', '📦', true, NULL);

-- +goose Down
DROP TABLE IF EXISTS categories CASCADE;
