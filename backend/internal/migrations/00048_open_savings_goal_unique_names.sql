-- +goose Up
-- Only open goals should reserve a name. Completed or deleted goals are history
-- and should not block creating a new goal with the same name.
ALTER TABLE savings_goals
DROP CONSTRAINT IF EXISTS savings_goals_organization_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_savings_goals_open_org_name
ON savings_goals (organization_id, name)
WHERE is_active = true AND is_completed = false;

-- +goose Down
DROP INDEX IF EXISTS idx_savings_goals_open_org_name;

ALTER TABLE savings_goals
ADD CONSTRAINT savings_goals_organization_id_name_key UNIQUE (organization_id, name);
