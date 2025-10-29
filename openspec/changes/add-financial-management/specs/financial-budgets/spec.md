# Financial Budgets Specification

## ADDED Requirements

### Budget Creation

Users can create monthly budgets for categories to track spending limits.

#### Scenario: Create fixed budget

**Given** an authenticated user with user_id 100
**When** they create a budget for category "Alimentação" with:
  - month: 3
  - year: 2025
  - type: "fixed"
  - amount: 1500.00
**Then** the budget is created successfully
**And** the budget.type is "fixed"
**And** the calculated amount equals 1500.00

#### Scenario: Create calculated budget with items

**Given** a budget for "Moradia" with type "calculated"
**And** budget items:
  - "Aluguel": 2000.00
  - "Condomínio": 500.00
  - "Internet": 100.00
**When** the user requests the budget details
**Then** the calculated amount equals 2600.00 (sum of items)
**And** the budget.type is "calculated"

#### Scenario: Create hybrid budget

**Given** a budget for "Transporte" with:
  - type: "hybrid"
  - amount: 500.00 (fixed baseline)
**And** budget items totaling 650.00
**When** the system calculates the final amount
**Then** the final amount equals 650.00 (max of 500.00 and 650.00)

### Budget Items

Users can break down budgets into specific line items for detailed planning.

#### Scenario: Add budget item

**Given** a budget with budget_id 10
**When** the user adds a budget item:
  - description: "Uber"
  - amount: 200.00
**Then** the budget item is created
**And** the budget item is linked to budget_id 10
**And** the budget's calculated amount includes this item

#### Scenario: Delete budget cascades to items

**Given** a budget with budget_id 10
**And** the budget has 5 budget_items
**When** the user deletes the budget
**Then** all 5 budget_items are deleted (CASCADE)
**And** the budget is removed from the database

### Budget Tracking

Users can compare actual spending vs budgeted amounts.

#### Scenario: Budget vs actual spending

**Given** a budget for "Alimentação" in March 2025 with amount 1500.00
**And** transactions in March totaling 1350.00 for "Alimentação"
**When** the user views the budget status
**Then** the response shows:
  - budgeted: 1500.00
  - spent: 1350.00
  - remaining: 150.00
  - percentage: 90%

#### Scenario: Overspent budget

**Given** a budget for "Lazer" in April 2025 with amount 500.00
**And** transactions in April totaling 650.00 for "Lazer"
**When** the user views the budget status
**Then** the response shows:
  - budgeted: 500.00
  - spent: 650.00
  - remaining: -150.00
  - percentage: 130%
  - status: "overspent"

### Budget Queries

Users can list and filter budgets by month, year, and category.

#### Scenario: List all budgets for a month

**Given** user has budgets for March 2025:
  - Alimentação: 1500.00
  - Transporte: 500.00
  - Moradia: 3000.00
**When** they request budgets for month=3, year=2025
**Then** all 3 budgets are returned
**And** each budget includes calculated final amount
**And** results are sorted by category name
