-- +goose Up
CREATE TABLE accounts (
    account_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id),
    organization_id INT NOT NULL REFERENCES organizations(organization_id),

    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,  -- 'checking', 'savings', 'credit_card', 'investment'
    bank_name VARCHAR(255),

    balance DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'BRL',

    is_active BOOLEAN DEFAULT true,

    -- Enforce user belongs to organization
    FOREIGN KEY (user_id, organization_id)
        REFERENCES user_organizations(user_id, organization_id)
);

-- Indexes for filtering and ownership
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_organization_id ON accounts(organization_id);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);

-- +goose Down
DROP TABLE IF EXISTS accounts CASCADE;
