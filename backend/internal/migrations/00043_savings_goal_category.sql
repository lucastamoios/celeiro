-- +goose Up
ALTER TABLE savings_goals ADD COLUMN category_id INT REFERENCES categories(category_id) ON DELETE SET NULL;
ALTER TABLE savings_goals ADD COLUMN monthly_contribution DECIMAL(15,2);

-- +goose Down
ALTER TABLE savings_goals DROP COLUMN IF EXISTS monthly_contribution;
ALTER TABLE savings_goals DROP COLUMN IF EXISTS category_id;
