-- +goose Up
-- Savings Goals feature: Track progress toward financial goals
-- Two types: "reserva" (planned future expenses) and "investimento" (long-term savings)

-- Step 1: Create savings_goals table
CREATE TABLE savings_goals (
    savings_goal_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    user_id INT NOT NULL,
    organization_id INT NOT NULL,

    name VARCHAR(100) NOT NULL,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('reserva', 'investimento')),
    target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
    due_date DATE,  -- Required for 'reserva', optional for 'investimento'

    icon VARCHAR(10),  -- Emoji icon
    color VARCHAR(7),  -- Hex color (#RRGGBB)

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,

    notes TEXT,

    -- Foreign key to user_organizations composite key
    FOREIGN KEY (user_id, organization_id)
        REFERENCES user_organizations(user_id, organization_id) ON DELETE CASCADE,

    -- Unique name per organization
    UNIQUE(organization_id, name)
);

-- Step 2: Add constraint for reserva type requiring due_date
-- Note: This is enforced at application level for flexibility, but we add a comment for clarity
COMMENT ON COLUMN savings_goals.due_date IS 'Required for reserva type, optional for investimento';

-- Step 3: Add savings_goal_id FK to transactions table
ALTER TABLE transactions
ADD COLUMN savings_goal_id INT REFERENCES savings_goals(savings_goal_id) ON DELETE SET NULL;

-- Step 4: Add savings_goal_id FK to planned_entries table
ALTER TABLE planned_entries
ADD COLUMN savings_goal_id INT REFERENCES savings_goals(savings_goal_id) ON DELETE SET NULL;

-- Step 5: Create indexes for performance
CREATE INDEX idx_savings_goals_user_org ON savings_goals(user_id, organization_id);
CREATE INDEX idx_savings_goals_type ON savings_goals(goal_type);
CREATE INDEX idx_savings_goals_active ON savings_goals(is_active);
CREATE INDEX idx_savings_goals_completed ON savings_goals(is_completed);
CREATE INDEX idx_transactions_savings_goal ON transactions(savings_goal_id);
CREATE INDEX idx_planned_entries_savings_goal ON planned_entries(savings_goal_id);

-- +goose Down
-- Rollback: Remove FK columns and table

DROP INDEX IF EXISTS idx_planned_entries_savings_goal;
DROP INDEX IF EXISTS idx_transactions_savings_goal;
DROP INDEX IF EXISTS idx_savings_goals_completed;
DROP INDEX IF EXISTS idx_savings_goals_active;
DROP INDEX IF EXISTS idx_savings_goals_type;
DROP INDEX IF EXISTS idx_savings_goals_user_org;

ALTER TABLE planned_entries DROP COLUMN IF EXISTS savings_goal_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS savings_goal_id;

DROP TABLE IF EXISTS savings_goals CASCADE;
