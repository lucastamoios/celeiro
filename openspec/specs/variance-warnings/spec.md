# variance-warnings Specification

## Purpose
TBD - created by archiving change add-category-centric-budgeting. Update Purpose after archive.
## Requirements
### Requirement: Calculate actual spending per category
The system MUST calculate actual spending from transactions for each category budget.

#### Scenario: Sum transactions for category in month
GIVEN category "Restaurants" has budget for October 2025
AND transactions exist:
  - Oct 5: R$ 150 (Restaurants)
  - Oct 12: R$ 200 (Restaurants)
  - Oct 20: R$ 173 (Restaurants)
WHEN calculating actual spending for Restaurants in October
THEN actualAmount must equal R$ 523.00
AND only transactions within October 2025 must be counted
AND only transactions with category_id matching Restaurants must be counted

### Requirement: Calculate variance percentage
The system MUST calculate how much actual spending deviates from planned budget.

#### Scenario: Over-budget variance calculation
GIVEN planned_amount = R$ 500.00
AND actual_amount = R$ 523.00
WHEN calculating variance
THEN variance_percent = ((523.00 - 500.00) / 500.00) * 100 = 4.6%

#### Scenario: Under-budget variance calculation
GIVEN planned_amount = R$ 500.00
AND actual_amount = R$ 450.00
WHEN calculating variance
THEN variance_percent = ((450.00 - 500.00) / 500.00) * 100 = -10.0%

#### Scenario: Handle zero planned amount
GIVEN planned_amount = R$ 0.00
AND actual_amount = R$ 100.00
WHEN calculating variance
THEN variance_percent must be NULL or handled gracefully
AND warning level must be CRITICAL (any spending when planned is zero)

### Requirement: Variance warning levels
The system MUST categorize budget variance into severity levels.

#### Scenario: OK status (within 1%)
GIVEN planned_amount = R$ 500.00
AND actual_amount = R$ 504.99
WHEN checking variance level
THEN variance_percent = 0.998%
AND status must be "OK"
AND no warning must be shown

#### Scenario: WARNING status (1-10%)
GIVEN planned_amount = R$ 500.00
AND actual_amount = R$ 505.00
WHEN checking variance level
THEN variance_percent = 1.0%
AND status must be "WARNING"
AND warning must be displayed with message "⚠️ 1.0% over budget"

#### Scenario: CRITICAL status (>10%)
GIVEN planned_amount = R$ 500.00
AND actual_amount = R$ 555.00
WHEN checking variance level
THEN variance_percent = 11.0%
AND status must be "CRITICAL"
AND error must be displayed with message "🚨 11.0% over budget"

#### Scenario: Under-budget also triggers warnings
GIVEN planned_amount = R$ 500.00
AND actual_amount = R$ 440.00
WHEN checking variance level
THEN variance_percent = -12.0%
AND status must be "CRITICAL"
AND warning must be "🚨 12.0% under budget (review planning)"

### Requirement: Variance report API
The system MUST allow users to be able to view variance warnings across all categories.

#### Scenario: GET variance warnings for month
GIVEN budgets exist for October 2025
AND some categories are over/under budget
WHEN sending GET /financial/variance-warnings?month=10&year=2025
THEN the response must be 200 OK
AND the response body must contain:
```json
{
  "month": 10,
  "year": 2025,
  "summary": {
    "totalCategories": 5,
    "okCount": 2,
    "warningCount": 2,
    "criticalCount": 1
  },
  "warnings": [
    {
      "categoryId": 5,
      "categoryName": "Restaurants",
      "plannedAmount": 500.00,
      "actualAmount": 523.00,
      "variancePercent": 4.6,
      "status": "WARNING"
    },
    {
      "categoryId": 3,
      "categoryName": "Transport",
      "plannedAmount": 300.00,
      "actualAmount": 335.00,
      "variancePercent": 11.67,
      "status": "CRITICAL"
    }
  ],
  "okCategories": [
    {
      "categoryId": 1,
      "categoryName": "Housing",
      "plannedAmount": 2000.00,
      "actualAmount": 2000.00,
      "variancePercent": 0.0,
      "status": "OK"
    }
  ]
}
```
AND warnings array must be sorted by abs(variance_percent) DESC
AND only WARNING and CRITICAL must appear in warnings array

### Requirement: Constants for thresholds
Variance thresholds MUST be defined as constants for easy adjustment.

#### Scenario: Threshold constants definition
WHEN implementing variance logic
THEN the following constants must be defined:
```go
const (
    CategoryVarianceWarningThreshold  = 0.01 // 1%
    CategoryVarianceCriticalThreshold = 0.10 // 10%
)
```
AND thresholds must be configurable via environment variables (future)

