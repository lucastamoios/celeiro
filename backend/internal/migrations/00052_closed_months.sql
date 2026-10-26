-- +goose Up
CREATE TABLE closed_months (
    closed_month_id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(organization_id),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL,
    closed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, month, year)
);

INSERT INTO closed_months (organization_id, month, year)
SELECT organization_id, month, year
FROM category_budgets
GROUP BY organization_id, month, year
HAVING BOOL_AND(is_consolidated)
ON CONFLICT (organization_id, month, year) DO NOTHING;

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION prevent_closed_month_budget_mutation()
RETURNS TRIGGER AS $$
DECLARE
    target_organization_id INT;
    target_month INT;
    target_year INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_organization_id := OLD.organization_id;
        target_month := OLD.month;
        target_year := OLD.year;
    ELSE
        target_organization_id := NEW.organization_id;
        target_month := NEW.month;
        target_year := NEW.year;
    END IF;

    IF EXISTS (
        SELECT 1 FROM closed_months
        WHERE organization_id = target_organization_id
          AND month = target_month
          AND year = target_year
    ) THEN
        RAISE EXCEPTION 'month is closed' USING ERRCODE = 'P0001';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER category_budgets_reject_closed_month
BEFORE INSERT OR UPDATE OR DELETE ON category_budgets
FOR EACH ROW EXECUTE FUNCTION prevent_closed_month_budget_mutation();

-- +goose Down
DROP TRIGGER IF EXISTS category_budgets_reject_closed_month ON category_budgets;
DROP FUNCTION IF EXISTS prevent_closed_month_budget_mutation();
DROP TABLE IF EXISTS closed_months;
