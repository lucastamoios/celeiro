-- +goose Up
ALTER TABLE monthly_snapshots
ALTER COLUMN variance_percent TYPE NUMERIC
USING variance_percent::NUMERIC;

-- +goose Down
ALTER TABLE monthly_snapshots
ALTER COLUMN variance_percent TYPE NUMERIC(5, 2)
USING variance_percent::NUMERIC(5, 2);
