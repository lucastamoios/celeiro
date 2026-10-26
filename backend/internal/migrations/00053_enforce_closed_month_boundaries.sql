-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION prevent_closed_month_budget_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') AND EXISTS (
        SELECT 1 FROM closed_months
        WHERE organization_id = OLD.organization_id
          AND month = OLD.month
          AND year = OLD.year
    ) THEN
        RAISE EXCEPTION 'month is closed' USING ERRCODE = 'P0001';
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') AND EXISTS (
        SELECT 1 FROM closed_months
        WHERE organization_id = NEW.organization_id
          AND month = NEW.month
          AND year = NEW.year
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

-- +goose StatementBegin
CREATE FUNCTION prevent_closed_month_transaction_mutation()
RETURNS TRIGGER AS $$
DECLARE
    old_organization_id INT;
    new_organization_id INT;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        SELECT organization_id INTO old_organization_id FROM accounts WHERE account_id = OLD.account_id;
        IF EXISTS (
            SELECT 1 FROM closed_months
            WHERE organization_id = old_organization_id
              AND month = EXTRACT(MONTH FROM OLD.transaction_date)::INT
              AND year = EXTRACT(YEAR FROM OLD.transaction_date)::INT
        ) THEN
            RAISE EXCEPTION 'month is closed' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT organization_id INTO new_organization_id FROM accounts WHERE account_id = NEW.account_id;
        IF EXISTS (
            SELECT 1 FROM closed_months
            WHERE organization_id = new_organization_id
              AND month = EXTRACT(MONTH FROM NEW.transaction_date)::INT
              AND year = EXTRACT(YEAR FROM NEW.transaction_date)::INT
        ) THEN
            RAISE EXCEPTION 'month is closed' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER transactions_reject_closed_month
BEFORE INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_closed_month_transaction_mutation();

-- +goose StatementBegin
CREATE FUNCTION prevent_closed_month_planned_status_mutation()
RETURNS TRIGGER AS $$
DECLARE
    old_organization_id INT;
    new_organization_id INT;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        SELECT organization_id INTO old_organization_id
        FROM planned_entries
        WHERE planned_entry_id = OLD.planned_entry_id;

        IF EXISTS (
            SELECT 1 FROM closed_months
            WHERE organization_id = old_organization_id
              AND month = OLD.month
              AND year = OLD.year
        ) THEN
            RAISE EXCEPTION 'month is closed' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT organization_id INTO new_organization_id
        FROM planned_entries
        WHERE planned_entry_id = NEW.planned_entry_id;

        IF EXISTS (
            SELECT 1 FROM closed_months
            WHERE organization_id = new_organization_id
              AND month = NEW.month
              AND year = NEW.year
        ) THEN
            RAISE EXCEPTION 'month is closed' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER planned_entry_statuses_reject_closed_month
BEFORE INSERT OR UPDATE OR DELETE ON planned_entry_statuses
FOR EACH ROW EXECUTE FUNCTION prevent_closed_month_planned_status_mutation();

-- +goose Down
DROP TRIGGER IF EXISTS planned_entry_statuses_reject_closed_month ON planned_entry_statuses;
DROP FUNCTION IF EXISTS prevent_closed_month_planned_status_mutation();
DROP TRIGGER IF EXISTS transactions_reject_closed_month ON transactions;
DROP FUNCTION IF EXISTS prevent_closed_month_transaction_mutation();

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
