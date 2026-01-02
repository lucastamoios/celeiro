# income-planning-discipline Specification

## Purpose
TBD - created by archiving change add-transaction-matching-system. Update Purpose after archive.
## Requirements
### Requirement: Income allocation threshold
The system MUST warn when more than 0.25% of income remains unallocated.

#### Scenario: Calculate unallocated percentage
GIVEN monthly income = R$ 10,000
AND total category budgets = R$ 9,950
WHEN checking income planning
THEN unallocated = R$ 50
AND unallocated percentage = 0.5%
AND status MUST be "WARNING" (exceeds 0.25% threshold)

#### Scenario: Income properly allocated
GIVEN monthly income = R$ 10,000
AND total category budgets = R$ 9,980
WHEN checking income planning
THEN unallocated = R$ 20
AND unallocated percentage = 0.2%
AND status MUST be "OK" (within 0.25% threshold)

### Requirement: Income planning report
The system MUST provide a planning report showing allocation status.

#### Scenario: GET income planning report
GIVEN a user has income and budgets for October 2025
WHEN sending GET /financial/income-planning?month=10&year=2025
THEN the response MUST be 200 OK
AND the response body MUST contain:
```json
{
  "month": 10,
  "year": 2025,
  "totalIncome": 10000.00,
  "totalPlanned": 9950.00,
  "unallocated": 50.00,
  "unallocatedPercent": 0.5,
  "threshold": 0.25,
  "status": "WARNING",
  "message": "0.50% of income unallocated (max: 0.25%)"
}
```

#### Scenario: Handle zero income gracefully
GIVEN a user has no income transactions for October
WHEN checking income planning
THEN unallocatedPercent MUST be NULL or 0
AND status MUST be "OK"
AND no warning SHOULD be shown

### Requirement: Income planning constants
Variance thresholds MUST be defined as constants.

#### Scenario: Threshold constant definition
WHEN implementing income planning logic
THEN the following constant MUST be defined:
```go
const UnplannedIncomeThreshold = 0.0025  // 0.25%
```

