-- +goose Up
ALTER TABLE savings_goals ADD COLUMN start_date DATE;

-- +goose Down
ALTER TABLE savings_goals DROP COLUMN IF EXISTS start_date;
