# Category Budget API

## Summary
HTTP endpoints for managing category budgets and planned entries.

## ADDED Requirements

### Requirement: List category budgets for month
The system MUST allow users to be able to view all category budgets for a given month.

#### Scenario: GET category budgets with query parameters
GIVEN a user is authenticated
WHEN sending GET /financial/category-budgets?month=10&year=2025
THEN the response must be 200 OK
AND the response body must contain JSON array of category budgets:
```json
[
  {
    "categoryBudgetId": 1,
    "categoryId": 5,
    "categoryName": "Restaurants",
    "categoryIcon": "🍔",
    "month": 10,
    "year": 2025,
    "budgetType": "calculated",
    "plannedAmount": 500.00,
    "actualAmount": 523.00,
    "variancePercent": 4.6,
    "isConsolidated": false
  }
]
```
AND actualAmount must be calculated on-the-fly from transactions
AND if month doesn't exist yet, budgets must be lazily initialized

#### Scenario: GET without month/year defaults to current month
GIVEN the current date is October 15, 2025
WHEN sending GET /financial/category-budgets
THEN budgets for October 2025 must be returned

### Requirement: Create or update category budget
The system MUST allow users to be able to set or modify a category's monthly budget.

#### Scenario: POST create category budget
GIVEN a user has category "Transport"
WHEN sending POST /financial/category-budgets with:
```json
{
  "categoryId": 3,
  "month": 10,
  "year": 2025,
  "budgetType": "fixed",
  "plannedAmount": 300.00
}
```
THEN the response must be 201 Created
AND a category_budget must be created
AND the response body must contain the created budget with ID

#### Scenario: PATCH update planned amount
GIVEN a category budget exists with ID=1, planned_amount=500.00
WHEN sending PATCH /financial/category-budgets/1 with:
```json
{
  "plannedAmount": 550.00
}
```
THEN the response must be 200 OK
AND the budget's planned_amount must be updated to 550.00
AND if budget_type is "calculated", the request must fail with 400 Bad Request (cannot manually set calculated budgets)

#### Scenario: Cannot modify consolidated budgets
GIVEN a category budget is consolidated (is_consolidated=true)
WHEN sending PATCH /financial/category-budgets/1
THEN the response must be 400 Bad Request
AND error message must be "Cannot modify consolidated budget"

### Requirement: Manage planned entries
The system MUST allow users to be able to create, update, and delete planned entries.

#### Scenario: GET planned entries for category
GIVEN category "Restaurants" has 2 planned entries
WHEN sending GET /financial/planned-entries?categoryId=5
THEN the response must be 200 OK
AND the response body must contain JSON array:
```json
[
  {
    "plannedEntryId": 1,
    "categoryId": 5,
    "description": "Weekly Lunch",
    "amount": 400.00,
    "isRecurrent": true,
    "parentEntryId": null,
    "expectedDay": 5,
    "isActive": true
  },
  {
    "plannedEntryId": 2,
    "categoryId": 5,
    "description": "Team Dinner",
    "amount": 100.00,
    "isRecurrent": false,
    "parentEntryId": null,
    "expectedDay": null,
    "isActive": true
  }
]
```

#### Scenario: POST create planned entry
GIVEN a user has category "Restaurants"
WHEN sending POST /financial/planned-entries with:
```json
{
  "categoryId": 5,
  "description": "Weekly Lunch",
  "amount": 400.00,
  "isRecurrent": true,
  "expectedDay": 5
}
```
THEN the response must be 201 Created
AND a planned_entry must be created
AND if category budget type is "calculated", planned_amount must be recalculated

#### Scenario: DELETE planned entry
GIVEN a planned entry exists with ID=1
WHEN sending DELETE /financial/planned-entries/1
THEN the response must be 204 No Content
AND the entry must be soft-deleted (is_active=false)
AND if entry is a recurrent template, all future instances must also be soft-deleted

### Requirement: Manual consolidation endpoint
Users/admins MUST be able to manually trigger month consolidation.

#### Scenario: POST consolidate month
GIVEN budgets exist for October 2025
AND October is not yet consolidated
WHEN sending POST /financial/consolidate?month=10&year=2025
THEN the response must be 200 OK
AND October budgets must be consolidated (is_consolidated=true)
AND monthly_snapshots must be created for all categories
AND response body must contain:
```json
{
  "month": 10,
  "year": 2025,
  "categoriesConsolidated": 5,
  "snapshotsCreated": 5
}
```

## REMOVED Requirements

### Requirement: Monthly budgets endpoints
Old budget endpoints are replaced by category-centric endpoints.

#### Scenario: Old endpoints return 404
WHEN sending GET /financial/budgets
THEN the response must be 404 Not Found
AND error message must be "Endpoint removed. Use /financial/category-budgets"

#### Scenario: Budget items endpoints removed
WHEN sending POST /financial/budgets/1/items
THEN the response must be 404 Not Found

## Related Capabilities
- Depends on: category-budgets-data (database schema)
- Depends on: lazy-consolidation (GET triggers lazy init)
- Depends on: planned-entries-management (POST/PATCH/DELETE recalculate budgets)
- Depends on: variance-warnings (GET calculates actual amounts)
