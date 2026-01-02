# category-budgets-data Specification

## Purpose
TBD - created by archiving change add-category-centric-budgeting. Update Purpose after archive.
## Requirements
### Requirement: Category budgets table schema
Each category MUST have a monthly budget with type, amount, and consolidation state.

#### Scenario: Create category_budgets table
GIVEN the database migration system
WHEN applying migration 00009_category_budgets.sql
THEN the `category_budgets` table must exist with:
- `category_budget_id` SERIAL PRIMARY KEY
- `user_id` INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
- `organization_id` INT NOT NULL REFERENCES organizations(organization_id)
- `category_id` INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE
- `month` INT NOT NULL CHECK (month BETWEEN 1 AND 12)
- `year` INT NOT NULL CHECK (year BETWEEN 2000 AND 2100)
- `budget_type` VARCHAR(20) NOT NULL CHECK (budget_type IN ('fixed', 'calculated', 'maior'))
- `planned_amount` DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (planned_amount >= 0)
- `is_consolidated` BOOLEAN NOT NULL DEFAULT FALSE
- `consolidated_at` TIMESTAMP
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
AND a UNIQUE constraint on (user_id, organization_id, category_id, month, year)
AND a FOREIGN KEY on (user_id, organization_id) REFERENCES user_organizations
AND indexes on:
- user_id
- organization_id
- category_id
- month, year
- is_consolidated

#### Scenario: One budget per category per month
GIVEN a user has a category "Restaurants"
AND a budget for October 2025 exists for Restaurants
WHEN attempting to create another budget for Restaurants in October 2025
THEN the database must reject the insert with a unique constraint violation

### Requirement: Planned entries table schema
The system MUST allow users to be able to create planned future transactions (recurrent or one-time).

#### Scenario: Create planned_entries table
GIVEN the database migration system
WHEN applying migration 00009_category_budgets.sql
THEN the `planned_entries` table must exist with:
- `planned_entry_id` SERIAL PRIMARY KEY
- `user_id` INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
- `organization_id` INT NOT NULL REFERENCES organizations(organization_id)
- `category_id` INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE
- `description` VARCHAR(255) NOT NULL
- `amount` DECIMAL(15,2) NOT NULL CHECK (amount >= 0)
- `is_recurrent` BOOLEAN NOT NULL DEFAULT FALSE
- `parent_entry_id` INT REFERENCES planned_entries(planned_entry_id)
- `expected_day` INT CHECK (expected_day BETWEEN 1 AND 31)
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
AND a FOREIGN KEY on (user_id, organization_id) REFERENCES user_organizations
AND indexes on:
- user_id
- organization_id
- category_id
- parent_entry_id
- is_recurrent

#### Scenario: Recurrent entry with monthly instances
GIVEN a user creates a recurrent entry "Weekly Lunch" with amount R$ 400
WHEN generating monthly instances for October
THEN a new planned_entry must be created with:
- `description` = "Weekly Lunch"
- `amount` = 400.00
- `is_recurrent` = FALSE
- `parent_entry_id` = <ID of recurrent template>
- `expected_day` = <same as parent>

### Requirement: Monthly snapshots table schema
Consolidated months MUST preserve historical budget vs actual data.

#### Scenario: Create monthly_snapshots table
GIVEN the database migration system
WHEN applying migration 00009_category_budgets.sql
THEN the `monthly_snapshots` table must exist with:
- `snapshot_id` SERIAL PRIMARY KEY
- `user_id` INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
- `organization_id` INT NOT NULL REFERENCES organizations(organization_id)
- `category_id` INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE
- `month` INT NOT NULL CHECK (month BETWEEN 1 AND 12)
- `year` INT NOT NULL CHECK (year BETWEEN 2000 AND 2100)
- `planned_amount` DECIMAL(15,2) NOT NULL
- `actual_amount` DECIMAL(15,2) NOT NULL
- `variance_percent` DECIMAL(5,2)
- `budget_type` VARCHAR(20) NOT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
AND a UNIQUE constraint on (user_id, organization_id, category_id, month, year)
AND indexes on:
- user_id
- organization_id
- category_id
- month, year

#### Scenario: Snapshot captures planning state
GIVEN a category budget for Restaurants in October 2025
AND planned_amount is R$ 500
AND actual spending is R$ 523
WHEN consolidating October
THEN a monthly_snapshot must be created with:
- `planned_amount` = 500.00
- `actual_amount` = 523.00
- `variance_percent` = 4.6
- `budget_type` = <current budget type>
AND the snapshot must never be modified after creation

