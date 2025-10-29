-- +goose Up
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    account_id INT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(category_id),

    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,  -- 'debit', 'credit'

    -- OFX-specific fields
    ofx_fitid VARCHAR(255),  -- Financial Institution Transaction ID
    ofx_check_number VARCHAR(50),
    ofx_memo TEXT,
    raw_ofx_data JSONB,  -- Store raw OFX for debugging

    -- Classification
    is_classified BOOLEAN DEFAULT false,
    classification_rule_id INT,  -- NULL if manual classification

    -- Metadata
    notes TEXT,
    tags VARCHAR(255)[]  -- PostgreSQL array for multiple tags
);

-- Critical indexes for performance
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_is_classified ON transactions(is_classified);

-- FITID deduplication: prevent duplicate imports
CREATE UNIQUE INDEX idx_transactions_ofx_fitid
ON transactions(account_id, ofx_fitid)
WHERE ofx_fitid IS NOT NULL;

-- Composite index for common query: transactions by account and date range
CREATE INDEX idx_transactions_account_date
ON transactions(account_id, transaction_date DESC);

-- +goose Down
DROP TABLE IF EXISTS transactions CASCADE;
