-- +goose Up
-- Enhanced planned entries for "Entrada Planejada" feature
-- Adds pattern linking, day range, amount range, and monthly status tracking

-- Step 1: Add new columns to planned_entries table
ALTER TABLE planned_entries
ADD COLUMN pattern_id INT REFERENCES patterns(pattern_id) ON DELETE SET NULL,
ADD COLUMN expected_day_start INT CHECK (expected_day_start IS NULL OR expected_day_start BETWEEN 1 AND 31),
ADD COLUMN expected_day_end INT CHECK (expected_day_end IS NULL OR expected_day_end BETWEEN 1 AND 31),
ADD COLUMN amount_min DECIMAL(15, 2) CHECK (amount_min IS NULL OR amount_min >= 0),
ADD COLUMN amount_max DECIMAL(15, 2) CHECK (amount_max IS NULL OR amount_max >= 0),
ADD COLUMN entry_type VARCHAR(20) NOT NULL DEFAULT 'expense' CHECK (entry_type IN ('expense', 'income'));

-- Step 2: Migrate existing expected_day to expected_day_start/expected_day_end
UPDATE planned_entries
SET expected_day_start = expected_day,
    expected_day_end = expected_day
WHERE expected_day IS NOT NULL;

-- Step 3: Add constraint for day range (start <= end)
ALTER TABLE planned_entries
ADD CONSTRAINT chk_planned_entries_valid_day_range CHECK (
    (expected_day_start IS NULL AND expected_day_end IS NULL) OR
    (expected_day_start IS NOT NULL AND expected_day_end IS NOT NULL AND
     expected_day_start <= expected_day_end)
);

-- Step 4: Add constraint for amount range (min <= max)
ALTER TABLE planned_entries
ADD CONSTRAINT chk_planned_entries_valid_amount_range CHECK (
    (amount_min IS NULL AND amount_max IS NULL) OR
    (amount_min IS NOT NULL AND amount_max IS NOT NULL AND amount_min <= amount_max)
);

-- Step 5: Create monthly status tracking table
CREATE TABLE planned_entry_statuses (
    status_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    planned_entry_id INT NOT NULL REFERENCES planned_entries(planned_entry_id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),

    -- Status: 'pending', 'matched', 'missed', 'dismissed'
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'matched', 'missed', 'dismissed')),

    -- Linked transaction (when matched)
    matched_transaction_id INT REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    matched_amount DECIMAL(15, 2),
    matched_at TIMESTAMP,

    -- Dismissal info
    dismissed_at TIMESTAMP,
    dismissal_reason TEXT,

    -- Unique constraint: one status per entry per month/year
    UNIQUE(planned_entry_id, month, year)
);

-- Step 6: Create indexes for performance
CREATE INDEX idx_planned_entry_statuses_entry ON planned_entry_statuses(planned_entry_id);
CREATE INDEX idx_planned_entry_statuses_month_year ON planned_entry_statuses(month, year);
CREATE INDEX idx_planned_entry_statuses_status ON planned_entry_statuses(status);
CREATE INDEX idx_planned_entry_statuses_transaction ON planned_entry_statuses(matched_transaction_id);
CREATE INDEX idx_planned_entries_pattern ON planned_entries(pattern_id);
CREATE INDEX idx_planned_entries_entry_type ON planned_entries(entry_type);

-- +goose Down
-- Rollback: Remove new table and columns

DROP TABLE IF EXISTS planned_entry_statuses CASCADE;

DROP INDEX IF EXISTS idx_planned_entries_pattern;
DROP INDEX IF EXISTS idx_planned_entries_entry_type;

ALTER TABLE planned_entries DROP CONSTRAINT IF EXISTS chk_planned_entries_valid_amount_range;
ALTER TABLE planned_entries DROP CONSTRAINT IF EXISTS chk_planned_entries_valid_day_range;

ALTER TABLE planned_entries DROP COLUMN IF EXISTS entry_type;
ALTER TABLE planned_entries DROP COLUMN IF EXISTS amount_max;
ALTER TABLE planned_entries DROP COLUMN IF EXISTS amount_min;
ALTER TABLE planned_entries DROP COLUMN IF EXISTS expected_day_end;
ALTER TABLE planned_entries DROP COLUMN IF EXISTS expected_day_start;
ALTER TABLE planned_entries DROP COLUMN IF EXISTS pattern_id;
