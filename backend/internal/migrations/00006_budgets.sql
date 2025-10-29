-- +goose Up
CREATE TABLE budgets (
    budget_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),

    name VARCHAR(255) NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),

    budget_type VARCHAR(20) NOT NULL,  -- 'fixed', 'calculated', 'hybrid'
    amount DECIMAL(15, 2) DEFAULT 0.00,  -- Used for 'fixed' and 'hybrid' types

    is_active BOOLEAN DEFAULT true,

    -- Enforce user belongs to organization
    FOREIGN KEY (user_id, organization_id)
        REFERENCES user_organizations(user_id, organization_id),

    -- Unique constraint: one budget per user/month/year
    UNIQUE(user_id, month, year)
);

CREATE TABLE budget_items (
    budget_item_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    budget_id INT NOT NULL REFERENCES budgets(budget_id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(category_id),

    planned_amount DECIMAL(15, 2) NOT NULL CHECK (planned_amount >= 0),

    -- Unique constraint: one item per category per budget
    UNIQUE(budget_id, category_id)
);

-- Indexes for performance
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_organization_id ON budgets(organization_id);
CREATE INDEX idx_budgets_month_year ON budgets(month, year);
CREATE INDEX idx_budgets_is_active ON budgets(is_active);

CREATE INDEX idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX idx_budget_items_category_id ON budget_items(category_id);

-- +goose Down
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
