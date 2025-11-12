-- +goose Up
-- Create category_budgets table for category-centric budgeting
CREATE TABLE category_budgets (
    category_budget_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,

    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),

    budget_type VARCHAR(20) NOT NULL CHECK (budget_type IN ('fixed', 'calculated', 'maior')),
    planned_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (planned_amount >= 0),

    is_consolidated BOOLEAN NOT NULL DEFAULT FALSE,
    consolidated_at TIMESTAMP,

    -- Enforce user belongs to organization
    FOREIGN KEY (user_id, organization_id)
        REFERENCES user_organizations(user_id, organization_id),

    -- Unique constraint: one budget per category per month per user
    UNIQUE(user_id, organization_id, category_id, month, year)
);

-- Create planned_entries table for recurrent and one-time planned transactions
CREATE TABLE planned_entries (
    planned_entry_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,

    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),

    is_recurrent BOOLEAN NOT NULL DEFAULT FALSE,
    parent_entry_id INT REFERENCES planned_entries(planned_entry_id),
    expected_day INT CHECK (expected_day BETWEEN 1 AND 31),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Enforce user belongs to organization
    FOREIGN KEY (user_id, organization_id)
        REFERENCES user_organizations(user_id, organization_id)
);

-- Create monthly_snapshots table for historical budget data
CREATE TABLE monthly_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,

    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),

    planned_amount DECIMAL(15, 2) NOT NULL,
    actual_amount DECIMAL(15, 2) NOT NULL,
    variance_percent DECIMAL(5, 2),
    budget_type VARCHAR(20) NOT NULL,

    -- Unique constraint: one snapshot per category per month per user
    UNIQUE(user_id, organization_id, category_id, month, year)
);

-- Indexes for category_budgets
CREATE INDEX idx_category_budgets_user_id ON category_budgets(user_id);
CREATE INDEX idx_category_budgets_organization_id ON category_budgets(organization_id);
CREATE INDEX idx_category_budgets_category_id ON category_budgets(category_id);
CREATE INDEX idx_category_budgets_month_year ON category_budgets(month, year);
CREATE INDEX idx_category_budgets_is_consolidated ON category_budgets(is_consolidated);

-- Indexes for planned_entries
CREATE INDEX idx_planned_entries_user_id ON planned_entries(user_id);
CREATE INDEX idx_planned_entries_organization_id ON planned_entries(organization_id);
CREATE INDEX idx_planned_entries_category_id ON planned_entries(category_id);
CREATE INDEX idx_planned_entries_parent_entry_id ON planned_entries(parent_entry_id);
CREATE INDEX idx_planned_entries_is_recurrent ON planned_entries(is_recurrent);

-- Indexes for monthly_snapshots
CREATE INDEX idx_monthly_snapshots_user_id ON monthly_snapshots(user_id);
CREATE INDEX idx_monthly_snapshots_organization_id ON monthly_snapshots(organization_id);
CREATE INDEX idx_monthly_snapshots_category_id ON monthly_snapshots(category_id);
CREATE INDEX idx_monthly_snapshots_month_year ON monthly_snapshots(month, year);

-- +goose Down
DROP TABLE IF EXISTS monthly_snapshots CASCADE;
DROP TABLE IF EXISTS planned_entries CASCADE;
DROP TABLE IF EXISTS category_budgets CASCADE;
