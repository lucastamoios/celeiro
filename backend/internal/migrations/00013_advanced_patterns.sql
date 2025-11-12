-- +goose Up
-- Create advanced_patterns table for regex-based transaction pattern matching
CREATE TABLE advanced_patterns (
    pattern_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

    -- Pattern matching rules (regex)
    description_pattern TEXT NOT NULL,  -- Required regex for description matching
    date_pattern TEXT,                  -- Optional regex for date (YYYY-MM-DD format)
    weekday_pattern TEXT,               -- Optional regex for weekday (0-6, e.g., "(0|3|5)")
    amount_min DECIMAL(15, 2),          -- Optional minimum amount
    amount_max DECIMAL(15, 2),          -- Optional maximum amount

    -- Target mapping
    target_description TEXT NOT NULL,   -- What to rename matched transactions to
    target_category_id INTEGER NOT NULL REFERENCES categories(category_id),

    -- Pattern behavior
    apply_retroactively BOOLEAN NOT NULL DEFAULT FALSE,  -- Apply to existing transactions on creation
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT valid_amount_range CHECK (
        (amount_min IS NULL AND amount_max IS NULL) OR
        (amount_min IS NOT NULL AND amount_max IS NOT NULL AND amount_min <= amount_max)
    )
);

-- Indexes for performance
CREATE INDEX idx_advanced_patterns_user_org ON advanced_patterns(user_id, organization_id);
CREATE INDEX idx_advanced_patterns_active ON advanced_patterns(is_active);
CREATE INDEX idx_advanced_patterns_category ON advanced_patterns(target_category_id);

-- +goose Down
-- Remove advanced_patterns table
DROP INDEX IF EXISTS idx_advanced_patterns_category;
DROP INDEX IF EXISTS idx_advanced_patterns_active;
DROP INDEX IF EXISTS idx_advanced_patterns_user_org;
DROP TABLE IF EXISTS advanced_patterns;
