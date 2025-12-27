-- +goose Up
ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#6B7280';

-- Update existing categories with default colors
UPDATE categories SET color = '#F59E0B' WHERE name = 'Alimentação';
UPDATE categories SET color = '#3B82F6' WHERE name = 'Educação';
UPDATE categories SET color = '#EC4899' WHERE name = 'Lazer';
UPDATE categories SET color = '#84CC16' WHERE name = 'Moradia';
UPDATE categories SET color = '#8B5CF6' WHERE name = 'Outros';
UPDATE categories SET color = '#14B8A6' WHERE name = 'Saúde';
UPDATE categories SET color = '#F97316' WHERE name = 'Transporte';

-- +goose Down
ALTER TABLE categories DROP COLUMN color;

