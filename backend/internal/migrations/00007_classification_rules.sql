-- +goose Up
CREATE TABLE classification_rules (
    rule_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(category_id),

    name VARCHAR(255) NOT NULL,
    priority INT NOT NULL DEFAULT 100,  -- Lower = higher priority (first match wins)

    -- Match conditions (all are optional, AND logic if multiple present)
    match_description VARCHAR(500),  -- Substring match (case-insensitive)
    match_amount_min DECIMAL(15, 2),
    match_amount_max DECIMAL(15, 2),
    match_transaction_type VARCHAR(20),  -- 'debit', 'credit', or NULL (any)

    is_active BOOLEAN DEFAULT true
);

-- Indexes for rule matching performance
CREATE INDEX idx_classification_rules_user_id ON classification_rules(user_id);
CREATE INDEX idx_classification_rules_category_id ON classification_rules(category_id);
CREATE INDEX idx_classification_rules_priority ON classification_rules(user_id, priority ASC, created_at ASC)
WHERE is_active = true;  -- Partial index for active rules only

-- +goose Down
DROP TABLE IF EXISTS classification_rules CASCADE;
